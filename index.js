#!/usr/bin/env node

const fs = require('fs')
const {
  promisify
} = require('util')
const FormData = require('form-data')
const axios = require('axios')
const host = process.argv.includes('--test')
  ? 'http://localhost:7001'
  : 'https://ceramic.gufoe.it'
const http = axios.create({
  baseURL: host+'/api/',
})
fs.statAsync = promisify(fs.stat)
const file_put = async (file, data) => {
  return await fs.writeFileSync(file, JSON.stringify(data))
}
const file_get = async file => {
  try {
    const data = await fs.readFileSync(file)
    return JSON.parse(data || 'null')
  } catch (e) {
    return null
  }
}
const download = async (token, path) => {
  const writer = fs.createWriteStream(path)

  const response = await axios({
    url: host + '/storage/' + token,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}


const commands = {
  async set(config, [project_secret]) {
    await file_put('.capacitor', {
      project_secret
    })
  },
  async build(config, [folder]) {
    if (!config.project_secret) {
      return console.log('Set a project id first')
    }
    const stats = await fs.statAsync(folder)
    if (!stats || !stats.isDirectory()) {
      return console.log(folder, 'is not a folder')
    }
    const zip_path = '/tmp/' + config.project_secret + '.zip'
    console.log('Zipping', folder)//, 'to', zip_path)
    const {
      zip
    } = require('zip-a-folder')
    await zip(folder, zip_path)
    var zip_file = fs.createReadStream(zip_path)
    let data = new FormData()
    data.append('file', zip_file)
    http.post('projects/' + config.project_secret + '/build', data, {
      headers: {
        ...data.getHeaders()
      }
    }).then(res => {
      console.log('Build queued')
      commands.track(config, [res.data.secret])
    }, err => {
      console.log('Upload error:', err.message)
      if (err.response) {
        console.log('Response:', err.response.data.message)
      }
    })
  },
  async track(config, [build_secret]) {
    let last_status = 'pending'
    let poll_fn = () => {
      http.get('builds/' + build_secret).then(res => {
        let build = res.data
        if (build.status != last_status) {
          console.log('     ', build.status)
          last_status = build.status
        }
        if (build.status == 'built') {
          console.log('Downloading apk...')
          const apk_path = '/tmp/' + build.project_id + '.apk'
          download(build.id+'-debug.apk', apk_path)
          console.log(apk_path)
        } else {
          setTimeout(poll_fn, 2000)
        }
      }, err => {
        console.log('Tracking error:', err.message)
        if (err.response) {
          console.log('Response:', err.response.data.message)
          setTimeout(poll_fn, 3000)
        }
      })
    }
    poll_fn()
  }
}

const main = async (args) => {
  const command = commands[args[2]]
  const config = await file_get('.capacitor') || {}
  if (!command) {
    console.log('Available commands: ' + Object.keys(commands).join(', '))
  } else {
    command(config, args.slice(3))
  }
}

main(process.argv.filter(x => x[0] != '-'))
