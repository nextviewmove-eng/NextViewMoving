import cloudinary from '../config/cloudinary.js';

export const DOCUMENTS_FOLDER = 'lets-get-moving/documents';

export const buildDocumentPublicId = (leadId, documentId) =>
  `${DOCUMENTS_FOLDER}/lead_${leadId}_document_${documentId}`;

export const buildDocumentDeliveryUrl = ({ publicId, format, resourceType }) =>
  cloudinary.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    type: 'upload',
    expires_in: 3600,
  });

const extractResponseDetails = (response) => {
  if (!response) return undefined;
  return {
    status: response.status ?? response.statusCode ?? response.http_code ?? undefined,
    statusText: response.statusText ?? undefined,
    body: response.body ?? response.data ?? response.text ?? undefined,
  };
};

const logCloudinaryError = (context, error) => {
  const details = {
    context,
    name: error.name ?? (error.constructor ? error.constructor.name : undefined),
    message: error.message,
    http_code: error.http_code,
    details: error.details ?? undefined,
    result: error.result ?? undefined,
    error: error.error?.body ?? error.error ?? undefined,
    response: extractResponseDetails(error.response),
  };
  Object.keys(details).forEach((key) => {
    if (details[key] === undefined) delete details[key];
  });
  console.error(`Cloudinary operation failed [${context}]:`, JSON.stringify(details));
};

export const uploadDocumentPdf = async ({ filePath, publicId }) => {
  let result;
  try {
    result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'raw',
      public_id: publicId,
      overwrite: true,
    });
  } catch (error) {
    logCloudinaryError('upload', error);
    throw error;
  }

  return {
    provider: 'CLOUDINARY',
    publicId: result.public_id,
    secureUrl: buildDocumentDeliveryUrl({
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
    }),
    resourceType: result.resource_type,
    format: result.format,
    bytes: result.bytes,
  };
};

export const deleteDocumentAsset = async (publicId) => {
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  return result;
};