import fs from 'fs'
import archiver from 'archiver'

const output = fs.createWriteStream('test.zip')
const archive = archiver('zip', {
    zlib: { level: 9 } // compression level
})
output.on('end', function () {
    console.log('END')
})
output.on('finish', function () {
    console.log('FINISH')
})
output.on('close', function () {
    console.log(archive.pointer() + ' total bytes')
})

archive.pipe(output)

archive.on('warning', function (err) {
    console.warn(err)
})
archive.on('error', function (err) {
    console.error(err)
})

archive.append(JSON.stringify({ user: 1111 }), { name: 'participants/1111.json' })
archive.append(JSON.stringify({ user: 2222 }), { name: 'participants/2222.json' })

archive.finalize()