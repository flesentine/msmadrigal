#!/usr/bin/env swift

import CoreGraphics
import Darwin
import Foundation
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(("ERROR: \(message)\n").data(using: .utf8)!)
    exit(1)
}

func loadImage(_ path: String) -> CGImage {
    let url = URL(fileURLWithPath: path) as CFURL
    guard let source = CGImageSourceCreateWithURL(url, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        fail("Could not decode PNG: \(path)")
    }
    return image
}

func renderRGB(_ image: CGImage, size: Int) -> ([UInt8], Int) {
    guard size > 0 else { fail("SIZE must be positive") }

    let bytesPerPixel = 4
    let bytesPerRow = size * bytesPerPixel
    var pixels = [UInt8](repeating: 0, count: bytesPerRow * size)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue)

    pixels.withUnsafeMutableBytes { raw in
        guard let context = CGContext(
            data: raw.baseAddress,
            width: size,
            height: size,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: colorSpace,
            bitmapInfo: bitmapInfo.rawValue
        ) else {
            fail("Could not create RGB bitmap context")
        }

        context.interpolationQuality = .none
        context.setFillColor(red: 0, green: 0, blue: 0, alpha: 1)
        context.fill(CGRect(x: 0, y: 0, width: size, height: size))

        // Bitmap contexts use Quartz's lower-left origin while PNG rows are
        // visually top-down. Flip once so generated icon artwork keeps the
        // same orientation as the checked-in source image.
        context.translateBy(x: 0, y: CGFloat(size))
        context.scaleBy(x: 1, y: -1)
        context.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
    }

    return (pixels, bytesPerRow)
}

func validateColorful(_ pixels: [UInt8], size: Int, bytesPerRow: Int, label: String) {
    var colors = Set<UInt32>()
    var nonBlack = 0

    for y in 0..<size {
        let row = y * bytesPerRow
        for x in 0..<size {
            let i = row + x * 4
            let r = pixels[i]
            let g = pixels[i + 1]
            let b = pixels[i + 2]
            colors.insert((UInt32(r) << 16) | (UInt32(g) << 8) | UInt32(b))
            if r != 0 || g != 0 || b != 0 {
                nonBlack += 1
            }
        }
    }

    let minimumNonBlack = max(1, (size * size) / 10)
    guard colors.count >= 16 && nonBlack >= minimumNonBlack else {
        fail("\(label): icon looks blank/monochrome (colors=\(colors.count), non_black=\(nonBlack))")
    }
}

func makeCGImage(_ pixels: inout [UInt8], size: Int, bytesPerRow: Int) -> CGImage {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue)

    return pixels.withUnsafeMutableBytes { raw in
        guard let context = CGContext(
            data: raw.baseAddress,
            width: size,
            height: size,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: colorSpace,
            bitmapInfo: bitmapInfo.rawValue
        ), let image = context.makeImage() else {
            fail("Could not create output CGImage")
        }
        return image
    }
}

func writePNG(_ image: CGImage, to path: String) {
    let url = URL(fileURLWithPath: path)
    try? FileManager.default.createDirectory(
        at: url.deletingLastPathComponent(),
        withIntermediateDirectories: true,
        attributes: nil
    )

    guard let destination = CGImageDestinationCreateWithURL(
        url as CFURL,
        UTType.png.identifier as CFString,
        1,
        nil
    ) else {
        fail("Could not create PNG destination: \(path)")
    }

    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else {
        fail("Could not write PNG: \(path)")
    }
}

let args = CommandLine.arguments

if args.count == 3 && args[1] == "--validate" {
    let image = loadImage(args[2])
    let sampleSize = min(max(image.width, image.height), 256)
    let (pixels, bytesPerRow) = renderRGB(image, size: sampleSize)
    validateColorful(pixels, size: sampleSize, bytesPerRow: bytesPerRow, label: args[2])
    print("\(args[2]): OK (decoded \(image.width)x\(image.height), colorful RGB artwork)")
    exit(0)
}

if args.count != 4 {
    FileHandle.standardError.write(("usage: \(args[0]) SOURCE.png OUTPUT.png SIZE\n       \(args[0]) --validate IMAGE.png\n").data(using: .utf8)!)
    exit(2)
}

let sourcePath = args[1]
let outputPath = args[2]
guard let size = Int(args[3]), size > 0 else { fail("SIZE must be a positive integer") }

let sourceImage = loadImage(sourcePath)
guard sourceImage.width == sourceImage.height else {
    fail("\(sourcePath): AppIcon source must be square")
}

var (pixels, bytesPerRow) = renderRGB(sourceImage, size: size)
validateColorful(pixels, size: size, bytesPerRow: bytesPerRow, label: outputPath)
let outputImage = makeCGImage(&pixels, size: size, bytesPerRow: bytesPerRow)
writePNG(outputImage, to: outputPath)
print("\(outputPath): OK (\(size)x\(size), opaque RGB PNG)")
