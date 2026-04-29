process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
fetch('https://mec-att-sys.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'staff.it3b@mec.edu.in', password: 'it3b', role: 'staff' })
})
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(console.log)
    .catch(console.error);
