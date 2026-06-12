const body = JSON.stringify({ username: 'test', password: 'test' })
const response = await fetch('http://localhost:3101/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body,
})

console.log('status', response.status)
console.log(await response.text())
