window.onscroll = () => {
    if (window.scrollY > 60) {
        document.querySelector('#scroll-top').classList.add('active');

    } else {
        document.querySelector('#scroll-top').classList.remove('active');
    }
}

function loader() {
    document.querySelector('.loader-container').classList.add('fade-out');
}

function fadeOut() {
    setInterval(loader, 3000);
}

fetch('http://localhost:3000/current-user')
    .then(res => res.json())
    .then(data => {
        if (data.name) {
            document.getElementById('userBox').style.display = 'flex';
            document.getElementById('username').innerText = data.name;
            document.getElementById('authButtons').style.display = 'none';
        }
    })
    .catch(() => {
        // user not logged in
    });
window.onload = fadeOut();