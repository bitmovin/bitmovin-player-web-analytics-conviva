export class BrowserUtils {
  public static isMobile(): boolean {
    const isAndroid: boolean = /Android/i.test(navigator.userAgent);
    const isIEMobile: boolean = /IEMobile/i.test(navigator.userAgent);
    const isEdgeMobile: boolean = /Windows Phone 10.0/i.test(navigator.userAgent);
    const isMobileSafari: boolean = /Safari/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent);
    return isAndroid || isIEMobile || isEdgeMobile || isMobileSafari;
  }
}
