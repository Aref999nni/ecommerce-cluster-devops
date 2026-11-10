import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [token, setToken] = useState(null);
  const [view, setView] = useState('choice'); // 'choice' | 'buyer' | 'seller'
  const [mode, setMode] = useState('login'); // 'login' ou 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [products, setProducts] = useState([]); // mes produits (vendeur)
  const [shopProducts, setShopProducts] = useState([]); // tous les produits (acheteur)
  const [cart, setCart] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pCategory, setPCategory] = useState('');
  const [pImage, setPImage] = useState('');
  const [fileKey, setFileKey] = useState(0);

  const authHeader = (tk) => ({ headers: { Authorization: 'Bearer ' + tk } });

  // MES PRODUITS (vendeur)
  const fetchProducts = async (tk = token) => {
    try {
      const res = await axios.get('http://localhost:5000/products', authHeader(tk));
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // TOUS LES PRODUITS (acheteur)
  const fetchAllProducts = async (tk = token) => {
    try {
      const res = await axios.get('http://localhost:5000/products?all=true', authHeader(tk));
      setShopProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ADD PRODUCT (vendeur)
  const addProduct = async () => {
    const price = parseFloat(pPrice);
    if (!pName || isNaN(price)) {
      alert('Nom et prix (nombre) obligatoires.');
      return;
    }
    try {
      await axios.post(
        'http://localhost:5000/products',
        { name: pName, price: price, category: pCategory, image: pImage },
        authHeader(token)
      );
      setPName('');
      setPPrice('');
      setPCategory('');
      setPImage('');
      setFileKey(fileKey + 1);
      fetchProducts();
    } catch (err) {
      alert("Ajout du produit echoue.");
    }
  };

  // IMAGE du produit : choisie sur le PC, redimensionnee (400px max) puis encodee en base64
  const imgStyle = { width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Choisis un fichier image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 400;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPImage(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // DELETE PRODUCT (vendeur)
  const deleteProduct = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    try {
      await axios.delete('http://localhost:5000/products/' + id, authHeader(token));
      fetchProducts();
    } catch (err) {
      alert('Suppression echouee.');
    }
  };

  // ADMIN
  const fetchAdminData = async (tk = token) => {
    try {
      const u = await axios.get('http://localhost:4000/admin/users', authHeader(tk));
      setAdminUsers(u.data);
      const p = await axios.get('http://localhost:5000/products?all=true', authHeader(tk));
      setShopProducts(p.data);
    } catch (err) {
      console.error(err);
      alert('Acces admin refuse.');
    }
  };

  const adminDeleteUser = async (id) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    try {
      await axios.delete('http://localhost:4000/admin/users/' + id, authHeader(token));
      fetchAdminData();
    } catch (err) {
      alert('Suppression impossible.');
    }
  };

  const adminDeleteProduct = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    try {
      await axios.delete('http://localhost:5000/admin/products/' + id, authHeader(token));
      fetchAdminData();
    } catch (err) {
      alert('Suppression impossible.');
    }
  };

  const chooseAdmin = () => {
    setView('admin');
    fetchAdminData();
  };

  // PANIER (cote frontend uniquement)
  const addToCart = (p) => {
    const existing = cart.find(i => i._id === p._id);
    if (existing) {
      setCart(cart.map(i => (i._id === p._id ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      setCart([...cart, { _id: p._id, name: p.name, price: Number(p.price) || 0, qty: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(i => i._id !== id));
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const chooseBuyer = () => {
    setView('buyer');
    fetchAllProducts();
  };

  const chooseSeller = () => {
    setView('seller');
    fetchProducts();
  };

  // LOGIN (Node.js Auth Service)
  const login = async () => {
    try {
      const res = await axios.post('http://localhost:4000/login', {
        username,
        password
      });
      setToken(res.data.token);
      setIsAdmin(Boolean(res.data.admin));
      setView('choice');
      alert('Login Successful!');
    } catch (err) {
      alert("Login Failed. Verifie le nom et le mot de passe, ou cree un compte.");
    }
  };

  // REGISTER (Node.js Auth Service)
  const register = async () => {
    if (!username || !email || !password || !confirmPassword) {
      alert('Remplis tous les champs.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Email invalide.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Les mots de passe ne correspondent pas.');
      return;
    }
    try {
      await axios.post('http://localhost:4000/register', {
        username,
        email,
        password
      });
      alert('Compte cree ! Tu peux maintenant te connecter.');
      setPassword('');
      setConfirmPassword('');
      setMode('login');
    } catch (err) {
      alert("Inscription echouee. Ce nom d'utilisateur existe peut-etre deja.");
    }
  };

  const logout = () => {
    setToken(null);
    setIsAdmin(false);
    setAdminUsers([]);
    setView('choice');
    setProducts([]);
    setShopProducts([]);
    setCart([]);
    setPassword('');
    setConfirmPassword('');
    setMode('login');
  };

  const switchMode = () => {
    setPassword('');
    setConfirmPassword('');
    setMode(mode === 'login' ? 'register' : 'login');
  };

  const linkStyle = { background: 'none', border: 'none', color: '#61dafb', cursor: 'pointer', textDecoration: 'underline' };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🛍️ MON TITRE</h1>

        {!token ? (
          <div className="card">
            <h2>{mode === 'login' ? 'Login' : 'Creer un compte'}</h2>
            <input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            {mode === 'register' && (
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            )}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {mode === 'register' && (
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            )}
            {mode === 'login' ? (
              <button onClick={login}>Login</button>
            ) : (
              <button onClick={register}>S'inscrire</button>
            )}
            <p className="small">
              {mode === 'login' ? "Pas de compte ? " : "Deja un compte ? "}
              <button onClick={switchMode} style={linkStyle}>
                {mode === 'login' ? "Creer un compte" : "Se connecter"}
              </button>
            </p>
          </div>
        ) : view === 'choice' ? (
          <div className="card">
            <h2>Bienvenue, {username} !</h2>
            <p>Que veux-tu faire ?</p>
            <button onClick={chooseBuyer}>🛒 Acheter</button>
            <button onClick={chooseSeller}>🏷️ Vendre</button>
            {isAdmin && <button onClick={chooseAdmin}>🛡️ Admin</button>}
            <p className="small">
              <button onClick={logout} style={linkStyle}>Logout</button>
            </p>
          </div>
        ) : view === 'admin' ? (
          <div className="card">
            <h2>🛡️ Admin</h2>

            <h3>Utilisateurs ({adminUsers.length})</h3>
            {adminUsers.map(u => (
              <p key={u.id}>
                #{u.id} {u.username} ({u.email || "pas d'email"}){' '}
                <button onClick={() => adminDeleteUser(u.id)} style={linkStyle}>Supprimer</button>
              </p>
            ))}

            <h3>Produits ({shopProducts.length})</h3>
            {shopProducts.map(p => (
              <p key={p._id}>
                {p.name} (${p.price}) - vendeur : {p.owner}{' '}
                <button onClick={() => adminDeleteProduct(p._id)} style={linkStyle}>Supprimer</button>
              </p>
            ))}

            <button onClick={() => fetchAdminData()}>Refresh</button>
            <button onClick={() => setView('choice')}>Changer de mode</button>
            <button onClick={logout}>Logout</button>
          </div>
        ) : view === 'buyer' ? (
          <div className="card">
            <h2>🛒 Acheter</h2>
            <p>Tous les produits ({shopProducts.length}) | Panier : {cartCount}</p>

            <div className="grid">
              {shopProducts.map(p => (
                <div key={p._id} className="product-card">
                  {p.image && <img src={p.image} alt={p.name} style={imgStyle} />}
                  <h3>{p.name}</h3>
                  <p className="price">${p.price}</p>
                  <p>{p.category}</p>
                  <p className="small">Vendeur : {p.owner}</p>
                  <button onClick={() => addToCart(p)}>Ajouter au panier</button>
                </div>
              ))}
            </div>

            <h3>🧺 Mon panier</h3>
            {cart.length === 0 ? (
              <p className="small">Panier vide.</p>
            ) : (
              <div>
                {cart.map(i => (
                  <p key={i._id}>
                    {i.name} x {i.qty} = ${(i.price * i.qty).toFixed(2)}{' '}
                    <button onClick={() => removeFromCart(i._id)} style={linkStyle}>Retirer</button>
                  </p>
                ))}
                <h3>Total : ${total.toFixed(2)}</h3>
              </div>
            )}

            <button onClick={() => fetchAllProducts()}>Refresh</button>
            <button onClick={() => setView('choice')}>Changer de mode</button>
            <button onClick={logout}>Logout</button>
          </div>
        ) : (
          <div className="card">
            <h2>🏷️ Vendre</h2>
            <p>Mes produits ({products.length})</p>

            <input
              placeholder="Nom du produit"
              value={pName}
              onChange={e => setPName(e.target.value)}
            />
            <input
              placeholder="Prix"
              value={pPrice}
              onChange={e => setPPrice(e.target.value)}
            />
            <input
              placeholder="Categorie"
              value={pCategory}
              onChange={e => setPCategory(e.target.value)}
            />
            <input
              key={fileKey}
              type="file"
              accept="image/*"
              onChange={handleImage}
            />
            {pImage && <img src={pImage} alt="apercu" style={{ ...imgStyle, maxWidth: 200 }} />}
            <button onClick={addProduct}>Mettre en vente</button>

            <div className="grid">
              {products.map(p => (
                <div key={p._id} className="product-card">
                  {p.image && <img src={p.image} alt={p.name} style={imgStyle} />}
                  <h3>{p.name}</h3>
                  <p className="price">${p.price}</p>
                  <p>{p.category}</p>
                  <button onClick={() => deleteProduct(p._id)}>Supprimer</button>
                </div>
              ))}
            </div>

            <button onClick={() => fetchProducts()}>Refresh</button>
            <button onClick={() => setView('choice')}>Changer de mode</button>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
