import { registerRootComponent } from 'expo';
import App from './App';

if (typeof document !== 'undefined') {
  document.documentElement.lang = 'ko';
  document.documentElement.setAttribute('translate', 'no');

  const meta = document.querySelector('meta[name="google"]') ?? document.createElement('meta');
  meta.setAttribute('name', 'google');
  meta.setAttribute('content', 'notranslate');
  document.head.appendChild(meta);

  const fontHref = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
  if (!document.querySelector(`link[href="${fontHref}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontHref;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
}

registerRootComponent(App);
