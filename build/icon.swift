// Draws the app icon: the cloud logo centred on the deck's navy.
// usage: swift icon.swift <logo.png> <out.png> <size>
import AppKit
let a = CommandLine.arguments
let logo = NSImage(contentsOfFile: a[1])!
let size = Int(a[3])!
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
                           samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSGraphicsContext.current!.imageInterpolation = .high
NSColor(red: 0x17/255, green: 0x32/255, blue: 0x4a/255, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: size, height: size).fill()
let s = CGFloat(size), lw = s * 0.62, lh = lw * logo.size.height / logo.size.width
logo.draw(in: NSRect(x: (s - lw) / 2, y: (s - lh) / 2, width: lw, height: lh))
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[2]))
