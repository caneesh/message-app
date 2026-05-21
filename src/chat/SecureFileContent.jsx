import { useSecureFileUrl } from '../hooks/useSecureFileUrl'

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function isImageType(contentType) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'].includes(contentType)
}

function SecureFileContent({ chatId, file }) {
  // Use stored URL for old messages, secure URL for new ones
  const needsSecureUrl = !file?.url && file?.storagePath
  const { url: secureUrl, loading, error } = useSecureFileUrl(
    needsSecureUrl ? chatId : null,
    needsSecureUrl ? file?.storagePath : null
  )

  const fileUrl = file?.url || secureUrl

  if (!file?.storagePath && !file?.url) {
    return <div className="file-error">File not available</div>
  }

  if (needsSecureUrl && loading) {
    return <div className="file-loading">Loading file...</div>
  }

  if (needsSecureUrl && error) {
    return <div className="file-error">Failed to load file</div>
  }

  if (isImageType(file.contentType)) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="file-image-link">
        <img src={fileUrl} alt={file.fileName} className="file-image" />
      </a>
    )
  }

  return (
    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="file-card">
      <span className="file-icon">
        {file.contentType === 'application/pdf' ? '📄' : '📝'}
      </span>
      <div className="file-info">
        <span className="file-name">{file.fileName}</span>
        <span className="file-size">{formatFileSize(file.size)}</span>
      </div>
    </a>
  )
}

export default SecureFileContent
