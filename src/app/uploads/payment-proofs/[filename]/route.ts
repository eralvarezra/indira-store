import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params

    // Security: prevent directory traversal
    const safeName = filename.replace(/\.\./g, '').replace(/\//g, '')
    if (safeName !== filename) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    // Determine the uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'payment-proofs')
    const filePath = path.join(uploadsDir, safeName)

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Read and return the file
    const fileBuffer = await readFile(filePath)

    // Determine content type based on extension
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    }
    const contentType = contentTypes[ext || ''] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
