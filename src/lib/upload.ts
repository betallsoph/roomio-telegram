// Xử lý ảnh phía client trước khi upload:
// 1. Resize về tối đa 1280px và nén JPEG (~150-300KB) để tiết kiệm băng thông
// 2. Đóng dấu thời gian + nhãn lên góc ảnh để chống dùng lại ảnh cũ (ảnh đồng hồ, bill)

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.72;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

export type UploadPurpose =
	| 'meter-reading'
	| 'maintenance-request'
	| 'tenant-document'
	| 'payment-proof'
	| 'contract'
	| 'room-asset';

type CompressOptions = {
	maxDimension?: number;
	quality?: number;
};

function validateImageFile(file: File) {
	if (!file.type.startsWith('image/')) {
		throw new Error('Vui lòng chọn file ảnh');
	}
	if (file.size > MAX_SOURCE_BYTES) {
		throw new Error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 12MB');
	}
}

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Không đọc được file ảnh'));
		};
		img.src = url;
	});
}

export async function compressImage(
	file: File,
	watermarkLabel?: string,
	options: CompressOptions = {}
): Promise<Blob> {
	validateImageFile(file);
	const img = await loadImage(file);

	const maxDimension = options.maxDimension ?? MAX_DIMENSION;
	const quality = options.quality ?? JPEG_QUALITY;
	const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
	const width = Math.round(img.width * scale);
	const height = Math.round(img.height * scale);

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(img, 0, 0, width, height);

	if (watermarkLabel) {
		const stamp = new Date().toLocaleString('vi-VN', { hour12: false });
		const text = `${watermarkLabel} • ${stamp}`;
		const fontSize = Math.max(14, Math.round(width / 45));
		ctx.font = `bold ${fontSize}px sans-serif`;
		const padding = fontSize * 0.6;
		const maxTextWidth = Math.max(0, width - padding * 2);
		const textWidth = Math.min(ctx.measureText(text).width, maxTextWidth);

		ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
		ctx.fillRect(
			0,
			height - fontSize - padding * 2,
			textWidth + padding * 2,
			fontSize + padding * 2
		);
		ctx.fillStyle = '#ffffff';
		ctx.textBaseline = 'middle';
		ctx.save();
		ctx.beginPath();
		ctx.rect(padding, height - fontSize - padding * 2, maxTextWidth, fontSize + padding * 2);
		ctx.clip();
		ctx.fillText(text, padding, height - (fontSize + padding * 2) / 2);
		ctx.restore();
	}

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Không nén được ảnh'))),
			'image/jpeg',
			quality
		);
	});
}

export async function uploadBlobToR2(blob: Blob, purpose: UploadPurpose): Promise<string> {
	const presignRes = await fetch('/api/uploads/presign', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			purpose,
			contentType: blob.type || 'image/jpeg',
			byteSize: blob.size
		})
	});
	const presign = await presignRes.json();
	if (!presignRes.ok) throw new Error(presign.error || 'Không xin được link upload');

	const uploadRes = await fetch(presign.uploadUrl, {
		method: 'PUT',
		headers: presign.headers,
		body: blob
	});
	if (!uploadRes.ok) throw new Error('Upload ảnh lên R2 thất bại');

	return presign.publicUrl || presign.url;
}

export async function uploadImageToR2(
	file: File,
	purpose: UploadPurpose,
	watermarkLabel?: string
): Promise<string> {
	const blob = await compressImage(file, watermarkLabel);
	return uploadBlobToR2(blob, purpose);
}

// Nén (kèm watermark nếu có nhãn) rồi upload, trả về URL ảnh trên server
export async function uploadImage(file: File, watermarkLabel?: string): Promise<string> {
	const blob = await compressImage(file, watermarkLabel);

	const formData = new FormData();
	formData.append('file', new File([blob], 'photo.jpg', { type: 'image/jpeg' }));

	const res = await fetch('/api/upload', { method: 'POST', body: formData });
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || 'Upload ảnh thất bại');

	return data.url;
}
