import QRCode from "qrcode";

/**
 * Generates a QR code image as a data URL.
 * @param id - The dynamic id to be appended to the join URL.
 * @returns A promise that resolves to the data URL string of the QR code.
 */
export async function generateQRCode(id: string): Promise<string> {
  // Construct the URL with the dynamic id.
  const url = `https://quizzma.no/audience?id=${encodeURIComponent(id)}`;

  try {
    // Generate the QR code as a Data URL.
    const dataUrl: string = await QRCode.toDataURL(url);
    return dataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code.");
  }
}
