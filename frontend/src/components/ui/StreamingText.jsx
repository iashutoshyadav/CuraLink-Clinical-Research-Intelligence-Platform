import React, { useEffect, useRef } from 'react';

export default function StreamingText({ text, isStreaming }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [text]);

  return (
    <span ref={ref} className={`whitespace-pre-wrap${isStreaming ? ' typing-cursor' : ''}`}>
      {text}
    </span>
  );
}
