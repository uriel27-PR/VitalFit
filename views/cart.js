// public/js/cart.js
document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const cartModal = document.getElementById('cart-modal');
    const cartItemsBody = document.getElementById('cart-items-body');
    const cartTotal = document.getElementById('cart-total');
    const clearCartBtn = document.getElementById('clear-cart');
    const closeModal = document.querySelector('.close');

    // Mostrar/Ocultar modal del carrito
    document.querySelector('.cart-icon').addEventListener('click', () => {
        cartModal.style.display = 'block';
        loadCart(); // Cargar carrito al abrir
    });

    closeModal.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });

    // Agregar productos al carrito
    document.addEventListener('click', async function(e) {
        if (e.target.classList.contains('agregar-carrito')) {
            const productoId = e.target.dataset.productoId;
            try {
                const response = await fetch('/agregar-al-carrito', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        productoId: productoId,
                        cantidad: 1
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    mostrarMensaje('Producto agregado al carrito', 'success');
                    loadCart();
                } else {
                    mostrarMensaje(data.error, 'error');
                }
            } catch (error) {
                mostrarMensaje('Error al agregar al carrito', 'error');
            }
        }
    });

    // Cargar contenido del carrito
    async function loadCart() {
        try {
            const response = await fetch('/carrito');
            const data = await response.json();
            renderCart(data.items);
            updateTotal(data.total);
        } catch (error) {
            mostrarMensaje('Error al cargar el carrito', 'error');
        }
    }

    // Renderizar items del carrito
    function renderCart(items) {
        cartItemsBody.innerHTML = '';
        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.nombre}</td>
                <td>$${item.precio.toFixed(2)}</td>
                <td>
                    <div class="quantity-controls">
                        <button onclick="updateQuantity(${item.cart_item_id}, ${item.cantidad - 1})">-</button>
                        <span>${item.cantidad}</span>
                        <button onclick="updateQuantity(${item.cart_item_id}, ${item.cantidad + 1})">+</button>
                    </div>
                </td>
                <td>$${item.total.toFixed(2)}</td>
                <td>
                    <button onclick="removeItem(${item.cart_item_id})" class="btn-delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            cartItemsBody.appendChild(row);
        });
    }

    // Actualizar cantidad
    window.updateQuantity = async function(cartItemId, newQuantity) {
        if (newQuantity < 1) return;
        
        try {
            const response = await fetch(`/actualizar-carrito/${cartItemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cantidad: newQuantity })
            });

            if (response.ok) {
                loadCart();
                mostrarMensaje('Cantidad actualizada', 'success');
            } else {
                const data = await response.json();
                mostrarMensaje(data.error, 'error');
            }
        } catch (error) {
            mostrarMensaje('Error al actualizar cantidad', 'error');
        }
    };

    // Eliminar item del carrito
    window.removeItem = async function(cartItemId) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;

        try {
            const response = await fetch(`/eliminar-del-carrito/${cartItemId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadCart();
                mostrarMensaje('Producto eliminado del carrito', 'success');
            }
        } catch (error) {
            mostrarMensaje('Error al eliminar producto', 'error');
        }
    };

    // Vaciar carrito
    clearCartBtn.addEventListener('click', async function() {
        if (!confirm('¿Estás seguro de vaciar el carrito?')) return;

        try {
            const response = await fetch('/vaciar-carrito', {
                method: 'DELETE'
            });

            if (response.ok) {
                loadCart();
                mostrarMensaje('Carrito vaciado', 'success');
            }
        } catch (error) {
            mostrarMensaje('Error al vaciar carrito', 'error');
        }
    });

    // Función para mostrar mensajes
    function mostrarMensaje(mensaje, tipo) {
        const div = document.createElement('div');
        div.className = `mensaje ${tipo}`;
        div.textContent = mensaje;
        document.body.appendChild(div);

        setTimeout(() => {
            div.remove();
        }, 3000);
    }

    // Actualizar total
    function updateTotal(total) {
        cartTotal.textContent = `Total: $${total.toFixed(2)}`;
    }
});
