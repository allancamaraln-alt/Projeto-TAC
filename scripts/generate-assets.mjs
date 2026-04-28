import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'fs'

function convert(input, output, width) {
  const svg = readFileSync(input, 'utf-8')
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
  const png = resvg.render().asPng()
  writeFileSync(output, png)
  console.log(`✓ ${output}`)
}

convert('resources/icon.svg',   'resources/icon.png',   1024)
convert('resources/splash.svg', 'resources/splash.png', 2732)
