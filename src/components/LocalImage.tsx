import { useEffect, useState } from 'react';
import { isExternalUrl, resolveAssetPath } from '../lib/paths';

interface LocalImageProps {
  src?: string;
  alt?: string;
  currentPath: string;
  files?: Map<string, File>;
}

export default function LocalImage({ src = '', alt = '', currentPath, files }: LocalImageProps) {
  const [url, setUrl] = useState(src);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    setMissing(false);
    if (!src || isExternalUrl(src) || src.startsWith('data:')) {
      setUrl(src);
      return;
    }
    const path = resolveAssetPath(src, currentPath);
    const file = path ? files?.get(path) : undefined;
    if (!file) {
      setUrl('');
      setMissing(true);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [currentPath, files, src]);
  if (missing) return <span className="missing-image" role="img" aria-label={alt || 'Missing image'}>{alt || 'Image unavailable'}</span>;
  return <img src={url} alt={alt} onError={() => setMissing(true)} />;
}

