// Xử lý ảnh phía client trước khi upload:
// 1. Resize về tối đa 1280px và nén JPEG (~150-300KB) để tiết kiệm băng thông
// 2. Đóng dấu thời gian + nhãn lên góc ảnh để chống dùng lại ảnh cũ (ảnh đồng hồ, bill)

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.72;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export const METER_PHOTO_ASPECT_RATIO = 3 / 4;

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
	aspectRatio?: number;
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
	let sourceX = 0;
	let sourceY = 0;
	let sourceWidth = img.width;
	let sourceHeight = img.height;

	if (options.aspectRatio && options.aspectRatio > 0) {
		const sourceRatio = img.width / img.height;
		if (sourceRatio > options.aspectRatio) {
			sourceWidth = img.height * options.aspectRatio;
			sourceX = (img.width - sourceWidth) / 2;
		} else {
			sourceHeight = img.width / options.aspectRatio;
			sourceY = (img.height - sourceHeight) / 2;
		}
	}

	const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
	const width = Math.round(sourceWidth * scale);
	const height = Math.round(sourceHeight * scale);

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

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
	let presignRes: Response;
	try {
		presignRes = await fetch('/api/uploads/presign', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				purpose,
				contentType: blob.type || 'image/jpeg',
				byteSize: blob.size
			})
		});
	} catch {
		throw new Error('Không kết nối được máy chủ để xin link upload');
	}

	const presign = await presignRes.json().catch(() => ({}));
	if (!presignRes.ok) throw new Error(presign.error || 'Không xin được link upload');

	let uploadUrl: URL;
	try {
		uploadUrl = new URL(presign.uploadUrl);
		if (uploadUrl.protocol !== 'https:' && uploadUrl.protocol !== 'http:') throw new Error();
	} catch {
		throw new Error('Máy chủ trả về link upload R2 không hợp lệ');
	}

	let uploadRes: Response;
	try {
		uploadRes = await fetch(uploadUrl.toString(), {
			method: 'PUT',
			headers: presign.headers || { 'Content-Type': blob.type || 'image/jpeg' },
			body: blob
		});
	} catch {
		throw new Error('Không kết nối được R2. Vui lòng thử lại');
	}
	if (!uploadRes.ok) throw new Error(`Upload ảnh lên R2 thất bại (${uploadRes.status})`);

	const publicUrl = presign.publicUrl || presign.url;
	try {
		return new URL(publicUrl).toString();
	} catch {
		throw new Error('Máy chủ trả về link ảnh không hợp lệ');
	}
}

export async function uploadImageToR2(
	file: File,
	purpose: UploadPurpose,
	watermarkLabel?: string,
	options: CompressOptions = {}
): Promise<string> {
	const blob = await compressImage(file, watermarkLabel, options);
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
