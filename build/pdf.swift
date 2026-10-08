// Renders each PDF page to JPEG thumbnails and dumps page text as JSON.
// usage: swift pdf.swift <in.pdf> <outdir> <largeWidth> <smallWidth> <text.json>
import PDFKit
import AppKit

let args = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: args[1]))!
let out = URL(fileURLWithPath: args[2])
let widths = [(Int(args[3])!, "thumbs"), (Int(args[4])!, "thumbs/sm")]
for (_, dir) in widths {
    try! FileManager.default.createDirectory(at: out.appendingPathComponent(dir), withIntermediateDirectories: true)
}

func render(_ page: PDFPage, width: Int) -> Data {
    let box = page.bounds(for: .mediaBox)
    let scale = CGFloat(width) / box.width
    let w = width, h = Int((box.height * scale).rounded())
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    let ctx = NSGraphicsContext(bitmapImageRep: rep)!.cgContext
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    ctx.interpolationQuality = .high
    ctx.scaleBy(x: scale, y: scale)
    ctx.translateBy(x: -box.origin.x, y: -box.origin.y)
    page.draw(with: .mediaBox, to: ctx)
    return rep.representation(using: .jpeg, properties: [.compressionFactor: 0.8])!
}

var texts: [String] = []
for i in 0..<doc.pageCount {
    let page = doc.page(at: i)!
    texts.append(page.string ?? "")
    let name = String(format: "%03d.jpg", i + 1)
    for (w, dir) in widths {
        try! render(page, width: w).write(to: out.appendingPathComponent(dir).appendingPathComponent(name))
    }
}
let json = try! JSONSerialization.data(withJSONObject: texts)
try! json.write(to: URL(fileURLWithPath: args[5]))
print("rendered \(doc.pageCount) pages")
