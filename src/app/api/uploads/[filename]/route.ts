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

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const filepath = path.join(process.cwd(), 'public', 'uploads', filename)

    // Check if file exists
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Read file
    const buffer = await readFile(filepath)

    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    }
    const contentType = contentTypes[ext || ''] || 'application/octet-stream'

    return new NextResponse(buffer, {
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