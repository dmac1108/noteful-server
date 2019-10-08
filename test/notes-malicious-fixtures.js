const maliciousNote = {
    id: 911,
    name: 'Naughty naughty very naughty <script>alert("xss");</script>',
    folderid: 1,
    content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
  }

  module.exports = maliciousNote;