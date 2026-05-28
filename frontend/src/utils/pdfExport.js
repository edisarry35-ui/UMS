import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export async function exportElementAsPdf(element, filename) {
  if (!element) {
    throw new Error("Export element is required");
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff"
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let offsetY = 0;
  let remainingHeight = imgHeight;

  pdf.addImage(imgData, "PNG", 0, offsetY, imgWidth, imgHeight);

  while (remainingHeight > pdfHeight) {
    offsetY -= pdfHeight;
    remainingHeight -= pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, offsetY, imgWidth, imgHeight);
  }

  pdf.save(filename);
}
