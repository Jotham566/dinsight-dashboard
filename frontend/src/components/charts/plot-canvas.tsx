'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ErrorBoundary } from '@/components/error-boundary';

/**
 * Plotly wrapper that checks for WebGL once on mount and renders an Alert
 * surface if WebGL is unavailable (headless browsers, sandboxed embeds,
 * accessibility tools). Without this, Plotly inserts an unstyled blue
 * `https://get.webgl.org` link straight into the chart container, which
 * looks like a bug to operators.
 *
 * All Plotly props pass through unchanged when WebGL is supported.
 */
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type PlotProps = ComponentProps<typeof Plot>;

function detectWebGL(): boolean {
  if (typeof window === 'undefined') return true; // server: optimistic
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function PlotCanvas(props: PlotProps) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglOk(detectWebGL());
  }, []);

  if (webglOk === false) {
    return (
      <Alert variant="warning" className="m-4">
        <AlertTitle>Charts can't render in this browser</AlertTitle>
        <AlertDescription>
          WebGL is not available, so the live scatter and trend plots can't be drawn. Open the
          dashboard in Chrome, Edge, Safari, or Firefox with hardware acceleration enabled.
        </AlertDescription>
      </Alert>
    );
  }

  // While detecting, render nothing rather than flashing the Plotly fallback.
  if (webglOk === null) return null;

  // Wrap the Plotly mount so a render-time crash inside plotly.js (rare but
  // observed on degenerate data shapes) surfaces an inline fallback instead
  // of tearing down the entire dashboard.
  return (
    <ErrorBoundary
      fallback={
        <Alert variant="warning" className="m-4">
          <AlertTitle>Chart failed to render</AlertTitle>
          <AlertDescription>
            Something went wrong rendering this chart. The rest of the page is unaffected; refresh
            to try again.
          </AlertDescription>
        </Alert>
      }
    >
      <Plot {...props} />
    </ErrorBoundary>
  );
}
