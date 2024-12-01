import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import multer from 'multer';
import mysql from 'mysql2/promise';

const app = express();
const PORT = 3002;

// Database Connection
const vitalfit = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vitalfit',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Middleware Configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'views')));
app.use(session({
    secret: 'secreto',
    resave: false,
    saveUninitialized: true
}));

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Middleware for Authentication
const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/iniciarsesion');
    }
    next();
};

// Root Route - Redirect to Principal Page
app.get('/', (req, res) => {
    res.render('principal');
});

// Principal Page Route
app.get('/principal', (req, res) => {
    res.render('principal');
});

// Login Page Route
app.get('/iniciarsesion', (req, res) => {
    res.render('iniciarsesion');
});

// Login Process
app.post('/iniciarsesion', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [results] = await vitalfit.query('SELECT * FROM usuarios WHERE email = ? AND password = ?', [email, password]);

        if (results.length > 0) {
            const usuario = results[0];
            req.session.userId = usuario.id;
            return res.redirect('/opcionescuenta');
        } else {
            return res.status(401).render('iniciarsesion', { error: 'Credenciales incorrectas' });
        }
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        return res.status(500).send('Error al iniciar sesión');
    }
});

// User Registration Process
app.post('/register', async (req, res) => {
    const { nombre, apellido_paterno, apellido_materno, email, password, direccion } = req.body;

    try {
        const query = 'INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, email, password, direccion) VALUES (?, ?, ?, ?, ?, ?)';
        await vitalfit.query(query, [nombre, apellido_paterno, apellido_materno, email, password, direccion]);
        res.redirect('/iniciarsesion');
    } catch (err) {
        console.error('Error al registrar el usuario:', err);
        return res.status(500).send('Error al registrar el usuario');
    }
});

// Account Options Page
app.get('/opcionescuenta', isAuthenticated, async (req, res) => {
    try {
        const [results] = await vitalfit.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);

        if (results.length > 0) {
            const usuario = results[0];
            res.render('opcionescuenta', { usuario });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    } catch (err) {
        console.error('Error al obtener el usuario:', err);
        return res.status(500).send('Error al obtener el usuario');
    }
});

// Update Account Page
app.get('/actualizarcuenta', isAuthenticated, async (req, res) => {
    try {
        const [results] = await vitalfit.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);

        if (results.length > 0) {
            const usuario = results[0];
            res.render('actualizarcuenta', { usuario });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    } catch (err) {
        console.error('Error al obtener el usuario:', err);
        return res.status(500).send('Error al obtener el usuario');
    }
});

// Update Account Process
app.post('/actualizarcuenta', isAuthenticated, async (req, res) => {
    const { nombre, apellido_paterno, apellido_materno, email, direccion } = req.body;

    try {
        const query = 'UPDATE usuarios SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, email = ?, direccion = ? WHERE id = ?';
        await vitalfit.query(query, [nombre, apellido_paterno, apellido_materno, email, direccion, req.session.userId]);
        res.redirect('/opcionescuenta');
    } catch (err) {
        console.error('Error al actualizar la cuenta:', err);
        return res.status(500).send('Error al actualizar la cuenta');
    }
});

// Delete Account Process
app.post('/eliminar', isAuthenticated, async (req, res) => {
    try {
        await vitalfit.query('DELETE FROM usuarios WHERE id = ?', [req.session.userId]);

        req.session.destroy(err => {
            if (err) {
                console.error('Error al destruir la sesión:', err);
                return res.status(500).send('Error al eliminar la cuenta');
            }
            res.redirect('/');
        });
    } catch (err) {
        console.error('Error al eliminar la cuenta:', err);
        return res.status(500).send('Error al eliminar la cuenta');
    }
});

// Newsletter Subscription
app.post('/suscribir-boletin', async (req, res) => {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
        return res.status(400).send('Correo electrónico inválido');
    }

    try {
        const query = 'INSERT INTO boletin (email) VALUES (?)';
        await vitalfit.query(query, [email]);
        res.status(200).send('Suscripción exitosa');
    } catch (err) {
        console.error('Error al suscribir:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).send('Este correo ya está suscrito');
        }
        return res.status(500).send('Error al suscribir: ' + err.message);
    }
});

// Ruta para la página de pago
app.get('/pago', isAuthenticated, async (req, res) => {
    try {
        // Obtener los items del carrito para el usuario actual
        const [items] = await vitalfit.query(`
            SELECT c.id, p.nombre, p.precio, c.cantidad, (p.precio * c.cantidad) AS total
            FROM carrito c
            JOIN productos p ON c.producto_id = p.id
            WHERE c.user_id = ?`, [req.session.userId]);

        // Calcular el total del carrito
        const total = items.reduce((sum, item) => sum + item.total, 0);

        // Renderizar la página de pago con los items y el total
        res.render('pago', { 
            items: items, 
            total: total 
        });
    } catch (err) {
        console.error('Error al obtener items para pago:', err);
        res.status(500).send('Error al cargar la página de pago');
    }
});



// Enhanced Checkout Process
app.post('/checkout', isAuthenticated, async (req, res) => {
    const { 
        paymentMethod, 
        totalAmount, 
        paymentReceived, 
        change 
    } = req.body;
    
    try {
        // Start a transaction
        await vitalfit.beginTransaction();

        // Get cart items
        const [cartItems] = await vitalfit.query(`
            SELECT 
                c.producto_id, 
                c.cantidad, 
                p.precio,
                p.nombre
            FROM carrito c
            JOIN productos p ON c.producto_id = p.id
            WHERE c.user_id = ?
        `, [req.session.userId]);

        // Validate cart is not empty
        if (cartItems.length === 0) {
            await vitalfit.rollback();
            return res.status(400).json({ error: 'El carrito está vacío' });
        }

        // Calculate total amount from cart items (for verification)
        const calculatedTotal = cartItems.reduce(
            (sum, item) => sum + (item.precio * item.cantidad), 
            0
        ).toFixed(2);

        // Verify total amount matches
        if (parseFloat(calculatedTotal) !== parseFloat(totalAmount)) {
            await vitalfit.rollback();
            return res.status(400).json({ error: 'Monto total no coincide' });
        }

        // Insert sale record
        const [saleResult] = await vitalfit.query(
            `INSERT INTO ventas (
                user_id, 
                total_amount, 
                payment_method, 
                payment_received, 
                change_amount, 
                status
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                req.session.userId, 
                totalAmount, 
                paymentMethod, 
                paymentReceived, 
                change, 
                'completado'
            ]
        );

        const ventaId = saleResult.insertId;

        // Insert sale details and update product stock
        for (let item of cartItems) {
            await vitalfit.query(
                `INSERT INTO detalle_ventas (
                    venta_id, 
                    producto_id, 
                    cantidad, 
                    precio_unitario, 
                    subtotal
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    ventaId, 
                    item.producto_id, 
                    item.cantidad, 
                    item.precio, 
                    item.precio * item.cantidad
                ]
            );

            // Update product stock
            await vitalfit.query(
                'UPDATE productos SET stock = stock - ? WHERE id = ?',
                [item.cantidad, item.producto_id]
            );
        }

        // Clear cart after successful checkout
        await vitalfit.query(
            'DELETE FROM carrito WHERE user_id = ?', 
            [req.session.userId]
        );

        // Commit transaction
        await vitalfit.commit();

        res.status(200).json({ 
            message: 'Compra realizada exitosamente', 
            ventaId,
            totalAmount,
            paymentReceived,
            change
        });
    } catch (err) {
        // Rollback transaction in case of error
        await vitalfit.rollback();
        console.error('Error en checkout:', err);
        res.status(500).json({ error: 'Error al procesar la compra', details: err.message });
    }
});


// Cart Routes
// Add to Cart
app.post('/agregar-al-carrito', isAuthenticated, async (req, res) => {
    const { productoId, cantidad } = req.body;

    // Validate input
    if (!productoId || cantidad <= 0) {
        return res.status(400).json({ error: 'Datos del producto inválidos' });
    }

    try {
        // Check if product exists and has sufficient stock
        const [productoExiste] = await vitalfit.query('SELECT * FROM productos WHERE id = ?', [productoId]);
        
        if (productoExiste.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const producto = productoExiste[0];

        if (producto.stock < cantidad) {
            return res.status(400).json({ error: 'Stock insuficiente' });
        }

        // Check if product already exists in cart
        const [existeEnCarrito] = await vitalfit.query(
            'SELECT * FROM carrito WHERE user_id = ? AND producto_id = ?', 
            [req.session.userId, productoId]
        );

        if (existeEnCarrito.length > 0) {
            // Update quantity if product already in cart
            await vitalfit.query(
                'UPDATE carrito SET cantidad = cantidad + ? WHERE user_id = ? AND producto_id = ?', 
                [cantidad, req.session.userId, productoId]
            );
            return res.status(200).json({ message: 'Cantidad actualizada en el carrito' });
        } else {
            // Add new product to cart
            await vitalfit.query(
                'INSERT INTO carrito (user_id, producto_id, cantidad) VALUES (?, ?, ?)', 
                [req.session.userId, productoId, cantidad]
            );
            return res.status(201).json({ message: 'Producto agregado al carrito' });
        }
    } catch (err) {
        console.error('Error al agregar al carrito:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Get Cart - Consultar Carrito
app.get('/carrito', isAuthenticated, async (req, res) => {
    try {
        // Fetch cart items with product details
        const [items] = await vitalfit.query(`
            SELECT 
                c.id AS cart_item_id, 
                p.id AS producto_id,
                p.nombre, 
                p.precio, 
                c.cantidad, 
                (p.precio * c.cantidad) AS total,
                p.imagen
            FROM carrito c
            JOIN productos p ON c.producto_id = p.id
            WHERE c.user_id = ?`, [req.session.userId]);

        // Calculate total cart value
        const total = items.reduce((sum, item) => sum + item.total, 0);

        res.status(200).json({ 
            items, 
            total: parseFloat(total.toFixed(2)) 
        });
    } catch (err) {
        console.error('Error al obtener el carrito:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Update Cart Item Quantity
app.put('/actualizar-carrito/:id', isAuthenticated, async (req, res) => {
    const { cantidad } = req.body;
    const cartItemId = req.params.id;

    // Validate input
    if (cantidad <= 0) {
        return res.status(400).json({ error: 'Cantidad inválida' });
    }

    try {
        // First, check the product stock
        const [cartItem] = await vitalfit.query(
            'SELECT producto_id FROM carrito WHERE id = ? AND user_id = ?', 
            [cartItemId, req.session.userId]
        );

        if (cartItem.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
        }

        const [productoExiste] = await vitalfit.query(
            'SELECT stock FROM productos WHERE id = ?', 
            [cartItem[0].producto_id]
        );

        if (productoExiste[0].stock < cantidad) {
            return res.status(400).json({ error: 'Stock insuficiente' });
        }

        // Update cart item quantity
        await vitalfit.query(
            'UPDATE carrito SET cantidad = ? WHERE id = ? AND user_id = ?', 
            [cantidad, cartItemId, req.session.userId]
        );

        res.status(200).json({ message: 'Cantidad actualizada' });
    } catch (err) {
        console.error('Error al actualizar el carrito:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Remove Item from Cart
app.delete('/eliminar-del-carrito/:id', isAuthenticated, async (req, res) => {
    const cartItemId = req.params.id;

    try {
        // Verify the cart item belongs to the current user
        const [cartItem] = await vitalfit.query(
            'SELECT * FROM carrito WHERE id = ? AND user_id = ?', 
            [cartItemId, req.session.userId]
        );

        if (cartItem.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
        }

        // Delete the cart item
        await vitalfit.query(
            'DELETE FROM carrito WHERE id = ? AND user_id = ?', 
            [cartItemId, req.session.userId]
        );

        res.status(200).json({ message: 'Producto eliminado del carrito' });
    } catch (err) {
        console.error('Error al eliminar del carrito:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Clear Entire Cart
app.delete('/vaciar-carrito', isAuthenticated, async (req, res) => {
    try {
        // Delete all cart items for the current user
        await vitalfit.query(
            'DELETE FROM carrito WHERE user_id = ?', 
            [req.session.userId]
        );

        res.status(200).json({ message: 'Carrito vaciado' });
    } catch (err) {
        console.error('Error al vaciar el carrito:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// Start Server
app.listen(PORT, () => {
    console.log(`Servidor corriendo en: http://localhost:${PORT}`);
});