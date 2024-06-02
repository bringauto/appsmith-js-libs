
export function URLCreate(url) {
    return new URL(url);
}

export function ConcentateWithNewline(arrayList) {
    return arrayList.join('\n');
}

export function catchError() {
    // Handling runtime errors
    const window_onerror = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
        console.log('Error message: ' + message);
        console.log('Source: ' + source);
        console.log('Line: ' + lineno);
        console.log('Column: ' + colno);
        console.log('Error object: ' + error);
        if(window_onerror) {
            return window_onerror(message, source, lineno, colno, error);
        }
        return true;
      };
}