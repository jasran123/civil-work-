import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ATTRIBUTES = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'font-family', 'font-size', 'font-weight', 'opacity'];

async function rasterizeFloorPlan(drawing, width, depth) {
  if (!drawing) throw new Error('Open the design plan before exporting.');
  const margin = 1.6;
  const planWidth = width + margin * 2;
  const planDepth = depth + margin * 2;
  const resolution = Math.min(70, 3600 / Math.max(planWidth, planDepth));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(planWidth * resolution);
  canvas.height = Math.ceil(planDepth * resolution);

  const svg = drawing.cloneNode(true);
  const originalElements = drawing.querySelectorAll('*');
  svg.querySelectorAll('*').forEach((node, index) => {
    const original = originalElements[index];
    if (original.matches('.house-plan-resize-handle, .house-plan-hit-area, .house-plan-wall-draft')) {
      node.remove();
      return;
    }
    const style = getComputedStyle(original);
    for (const attribute of ATTRIBUTES) {
      if (node.getAttribute(attribute)?.startsWith('url(')) continue;
      const value = style.getPropertyValue(attribute);
      if (value) node.setAttribute(attribute, value);
    }
    node.removeAttribute('class');
    node.style.removeProperty('--room-fill');
    node.style.removeProperty('--furniture-fill');
  });
  svg.removeAttribute('class');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox', `${-margin} ${-margin} ${planWidth} ${planDepth}`);
  svg.setAttribute('width', String(canvas.width));
  svg.setAttribute('height', String(canvas.height));

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Unable to render the floor plan for export.'));
      image.src = url;
    });
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas export is unavailable.');
    context.fillStyle = getComputedStyle(drawing).getPropertyValue('--plan-sheet').trim() || '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
  } finally {
    URL.revokeObjectURL(url);
  }
  return canvas;
}

function fileName(design, floorName) {
  return `${design.name || design.projectName || 'House Plan'} ${floorName}`.replace(/[^\p{L}\p{N}_-]+/gu, '_');
}

export async function exportFloorPlanPNG({ drawing, width, depth, design, floorName }) {
  const canvas = await rasterizeFloorPlan(drawing, width, depth);
  const link = document.createElement('a');
  link.download = `${fileName(design, floorName)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportFloorPlanPDF({ drawing, width, depth, design, floorName, plotDescription, rooms, stats }) {
  const canvas = await rasterizeFloorPlan(drawing, width, depth);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.setFillColor(27, 59, 112);
  pdf.rect(0, 0, 297, 27, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(`${design.name || design.projectName || 'House Plan'} — ${floorName}`, 14, 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`${plotDescription}  |  ${design.houseType}  |  ${design.roadFacing} Facing`, 14, 20);
  const ratio = Math.min(267 / canvas.width, 141 / canvas.height);
  const imageWidth = canvas.width * ratio;
  const imageHeight = canvas.height * ratio;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (297 - imageWidth) / 2, 36, imageWidth, imageHeight);
  pdf.setTextColor(60, 77, 106);
  pdf.text('Conceptual architectural floor plan', 14, 194);

  pdf.addPage();
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text(`${floorName} room schedule`, 14, 15);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Built-up area ${stats.totalBuiltUpArea} sq ft  |  Carpet area ${stats.carpetArea} sq ft`, 14, 22);
  pdf.autoTable({
    startY: 30,
    head: [['Room', 'Type', 'Width (ft)', 'Depth (ft)', 'Area (sq ft)', 'Openings']],
    body: rooms.map((room) => [room.name, room.type, room.width, room.height, Number((room.width * room.height).toFixed(2)), `${room.doors?.length || 0} doors, ${room.windows?.length || 0} windows`]),
    theme: 'striped',
    headStyles: { fillColor: [27, 59, 112] },
  });
  pdf.save(`${fileName(design, floorName)}.pdf`);
}
