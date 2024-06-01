
export function URLCreate(url) {
    return new URL(url);
}

export function ConcentateWithNewline(arrayList) {
    return arrayList.join('\n');
}

export async function loadLibrary(jsLibUrl) {
    try {
      const response = await fetch(jsLibUrl);
      const scriptText = await response.text();
      return eval(scriptText);
    } catch (error) {
      console.error(`Error loading library: ${error}`);
    }
}