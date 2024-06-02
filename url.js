
export function URLCreate(url) {
    return new URL(url);
}

export function ConcentateWithNewline(arrayList) {
    return arrayList.join('\n');
}

export function catchError() {
    window.addEventListener('error', function(event) {
      if (event.target instanceof HTMLScriptElement ||
          event.target instanceof HTMLLinkElement ||
          event.target instanceof HTMLImageElement) {
        console.log('Resource loading error: ' + event.target.src);
      } else {
        console.log('Error message: ' + event.message);
        console.log('Source: ' + event.filename);
        console.log('Line: ' + event.lineno);
        console.log('Column: ' + event.colno);
        console.log('Error object: ' + event.error);
      }
    }, true);
}