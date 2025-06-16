// QrCodeDisplay.tsx
import React, { useEffect, useState } from "react";
import { generateQRCode } from "./qrCodeGenerator";

interface QrCodeDisplayProps {
  dynamicId: string;
}

const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({ dynamicId }) => {
  const [qrCodeData, setQrCodeData] = useState<string>("");

  useEffect(() => {
    // Generate the QR code when the component mounts or when dynamicId changes.
    const createQRCode = async () => {
      try {
        const dataUrl = await generateQRCode(dynamicId);
        setQrCodeData(dataUrl);
      } catch (error) {
        console.error(error);
      }
    };

    void createQRCode();
  }, [dynamicId]);

  return (
    <div>
      {qrCodeData ? (
        <img src={qrCodeData} alt="QR Code" className={"w-full h-full"} />
      ) : (
        <p>Loading QR Code...</p>
      )}
    </div>
  );
};

export default QrCodeDisplay;
