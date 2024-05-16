import * as Conviva from '@convivainc/conviva-js-coresdk';

export class Html5Http implements Conviva.HttpInterface {
  public makeRequest(
    httpMethod: 'GET' | 'POST',
    url: string,
    data: string | null,
    contentType: string | null,
    timeoutMs: number,
    callback: Conviva.HttpRequestCallback | null,
  ): Conviva.HttpRequestCancelFunction {
    return this.makeRequestStandard.apply(this, arguments);
  }

  public release(): void {
    // nothing to release
  }

  private makeRequestStandard(
    httpMethod: 'GET' | 'POST',
    url: string,
    data: string | null,
    contentType: string | null,
    timeoutMs: number,
    callback: Conviva.HttpRequestCallback | null,
  ): Conviva.HttpRequestCancelFunction {
    const xmlHttpReq = new XMLHttpRequest();

    xmlHttpReq.open(httpMethod, url, true);

    if (contentType && xmlHttpReq.overrideMimeType) {
      xmlHttpReq.overrideMimeType(contentType);
    }
    if (contentType && xmlHttpReq.setRequestHeader) {
      xmlHttpReq.setRequestHeader('Content-Type', contentType);
    }
    if (timeoutMs > 0) {
      xmlHttpReq.timeout = timeoutMs;
      xmlHttpReq.ontimeout = function () {
        // Often this callback will be called after onreadystatechange.
        // The first callback called will cleanup the other to prevent duplicate responses.
        xmlHttpReq.ontimeout = xmlHttpReq.onreadystatechange = null;
        if (callback) {
          callback(false, 'timeout after ' + timeoutMs + ' ms');
        }
      };
    }

    xmlHttpReq.onreadystatechange = function () {
      if (xmlHttpReq.readyState === 4) {
        xmlHttpReq.ontimeout = xmlHttpReq.onreadystatechange = null;
        if (xmlHttpReq.status === 200) {
          if (callback) {
            callback(true, xmlHttpReq.responseText);
          }
        } else {
          if (callback) {
            callback(false, 'http status ' + xmlHttpReq.status);
          }
        }
      }
    };

    xmlHttpReq.send(data);

    return null; // no way to cancel the request
  }
}
