export class BitrateHelper {
  public static calculateKbps(bitrate: number) {
    // We calculate the bitrate with a divisor of 1000 so the values look nicer
    // Example: 250000 / 1000 => 250 kbps (250000 / 1024 => 244kbps)
    return Math.round(bitrate / 1000);
  }
}
