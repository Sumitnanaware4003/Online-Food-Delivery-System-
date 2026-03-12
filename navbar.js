
function checkUserLogin() {
    fetch('http://localhost:3000/current-user')
        .then(res => res.json())
        .then(user => {

            if (user) {
                document.getElementById('userBox').style.display = 'flex';
                document.getElementById('username').innerText = user.name;

                document.getElementById('loginBtn').style.display = 'none';
                document.getElementById('registerBtn').style.display = 'none';
            }
        });
}

fetch('http://localhost:3000/check-login')
  .then(res => res.json())
  .then(data => {
    if (data.loggedIn) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('registerBtn').style.display = 'none';
    }
  });

  

