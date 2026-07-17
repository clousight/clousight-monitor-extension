export function getExtensionVersion(): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
    return chrome.runtime.getManifest().version;
  }
  return 'dev';
}
