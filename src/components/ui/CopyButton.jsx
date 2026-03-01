import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import Button from './Button.jsx';

export default function CopyButton({ text, label = 'Kopiera', className = '' }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback för äldre webbläsare
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button
      variant={copied ? 'secondary' : 'primary'}
      onClick={handleCopy}
      className={className}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? '✓ Kopierat!' : label}
    </Button>
  );
}
