import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateMonthlyReport = (data) => {
    const doc = new jsPDF();
    const { summary, details } = data;
    const today = new Date().toLocaleDateString('id-ID');

    // Header
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('NURAGA', 20, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Integrated Safety Intelligence System', 20, 32);

    doc.setFontSize(12);
    doc.text(`Monthly Performance Report`, 140, 20);
    doc.text(`Date: ${today}`, 140, 27);

    // Summary Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.text('Safety Summary (Last 30 Days)', 20, 55);

    autoTable(doc, {
        startY: 65,
        head: [['Metric', 'Total Count', 'Status']],
        body: [
            ['Hazard Reports', summary.hazards, summary.hazards > 5 ? 'High Activity' : 'Stable'],
            ['Incident Reports', summary.incidents, summary.incidents > 0 ? 'Attention Needed' : 'All Clear'],
            ['Safety Audits', summary.audits, 'Conducted'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
    });

    // Hazards Table
    doc.setFontSize(14);
    doc.text('Detailed Hazards Log', 20, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Lokasi', 'Deskripsi', 'Tingkat Risiko', 'Status', 'Tanggal']],
        body: details.hazards.map(h => [
            h.lokasi,
            h.deskripsi,
            h.risiko,
            h.status,
            new Date(h.createdAt).toLocaleDateString('id-ID')
        ]),
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] }, // Amber-500
    });

    // Incidents Table
    if (details.incidents.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Detailed Incidents Log', 20, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Kategori', 'Kronologi', 'Korban', 'Estimasi Kerugian', 'Tanggal']],
            body: details.incidents.map(i => [
                i.kategori,
                i.kronologi,
                i.korban || 'Tidak ada',
                `Rp ${Number(i.loss_cost || 0).toLocaleString('id-ID')}`,
                new Date(i.createdAt).toLocaleDateString('id-ID')
            ]),
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68] }, // Red-500
        });
    }

    // Audits Table
    if (details.audits && details.audits.length > 0) {
        // Only add page if they are not already on a new page (or if table fits)
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Detailed Audits Log', 20, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Area', 'Hasil Pemeriksaan', 'Tanggal']],
            body: details.audits.map(a => [
                a.area,
                a.hasil,
                new Date(a.tanggal).toLocaleDateString('id-ID')
            ]),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }, // Blue-500
        });
    }

    doc.save(`Nuraga_Safety_Report_${today.replace(/\//g, '-')}.pdf`);
};

export const generateIncidentReport = (incident) => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('id-ID');

    // Header
    doc.setFillColor(239, 68, 68); // Red-500 for Incident
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INCIDENT REPORT', 20, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Nuraga Integrated Safety Intelligence System', 20, 32);

    doc.setFontSize(12);
    doc.text(`Date Generated: ${today}`, 140, 25);

    // Incident Details
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.text('Incident Investigation Details', 20, 55);

    autoTable(doc, {
        startY: 65,
        head: [['Field', 'Detail']],
        body: [
            ['Kategori', incident.kategori],
            ['Korban', incident.korban || 'Tidak ada korban'],
            ['Estimasi Kerugian (Loss Cost)', `Rp ${Number(incident.loss_cost || 0).toLocaleString('id-ID')}`],
            ['Pelapor', incident.User?.nama || 'Unknown'],
            ['Waktu Laporan', new Date(incident.createdAt).toLocaleString('id-ID')],
        ],
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] },
    });

    // Kronologi
    doc.setFontSize(14);
    doc.text('Kronologi Kejadian', 20, doc.lastAutoTable.finalY + 15);
    doc.setFontSize(11);
    const splitKronologi = doc.splitTextToSize(incident.kronologi || '', 170);
    doc.text(splitKronologi, 20, doc.lastAutoTable.finalY + 23);

    // 5 Whys Analysis
    let yPos = doc.lastAutoTable.finalY + 23 + (splitKronologi.length * 5) + 10;
    
    if (incident.five_whys) {
        let whys = [];
        try {
            whys = typeof incident.five_whys === 'string' ? JSON.parse(incident.five_whys) : incident.five_whys;
        } catch(e) {
            whys = incident.five_whys;
        }
        
        const whyList = [
            ['Why 1', whys.why1],
            ['Why 2', whys.why2],
            ['Why 3', whys.why3],
            ['Why 4', whys.why4],
            ['Why 5', whys.why5],
        ].filter(item => item[1]); // only keep non-empty

        if (whyList.length > 0) {
            // Check page overflow
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(14);
            doc.text('Analisis Akar Masalah (5 Whys)', 20, yPos);
            autoTable(doc, {
                startY: yPos + 5,
                head: [['Why Step', 'Penjelasan']],
                body: whyList,
                theme: 'striped',
                headStyles: { fillColor: [30, 41, 59] },
            });
        }
    }

    doc.save(`Incident_Report_${incident.kategori.replace(/\s+/g, '_')}_${incident.id_incident}.pdf`);
};
