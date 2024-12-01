// cart.js
document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const cartItemsBody = document.getElementById('cart-items-body');
    const cartTotal = document.getElementById('cart-total');
    const clearCartBtn = document.getElementById('clear-cart');
    
    // Cargar carrito al iniciar
    loadCart();

    // Función para cargar el carrito
    async function loadCart() {
        try {
            const response = await fetch('/carrito');
            const data = await response.json();
            
            renderCart(data.items);
            updateTotal(data.total);
        } catch (error) {
            console.error('Error al cargar el carrito:', error);
        }
    }

    // Función para renderizar el carrito
    function renderCart(items) {
        cartItemsBody.innerHTML = '';
        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.nombre}</td>
                <td>$${item.precio}</td>
                <td>
                    <input type="number" value="${item.cantidad}" 
                           min="1" onchange="updateQuantity(${item.cart_item_id}, this.value)">
                </td>
                <td>$${item.total}</td>
                <td>
                    <button onclick="removeItem(${item.cart_item_id})" class="btn-delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            cartItemsBody.appendChild(row);
        });
    }

    // Función para actualizar el total
    function updateTotal(total) {
        cartTotal.textContent = `Total: $${total.toFixed(2)}`;
    }

    // Función para agregar al carrito
    window.addToCart = async function(productoId) {
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
            
            if (response.ok) {
                loadCart(); // Recargar carrito
            }
        } catch (error) {
            console.error('Error al agregar al carrito:', error);
        }
    };

    // Función para actualizar cantidad
    window.updateQuantity = async function(cartItemId, newQuantity) {
        try {
            const response = await fetch(`/actualizar-carrito/${cartItemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cantidad: parseInt(newQuantity)
                })
            });
            
            if (response.ok) {
                loadCart(); // Recargar carrito
            }
        } catch (error) {
            console.error('Error al actualizar cantidad:', error);
        }
    };

    // Función para eliminar item
    window.removeItem = async function(cartItemId) {
        try {
            const response = await fetch(`/eliminar-del-carrito/${cartItemId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadCart(); // Recargar carrito
            }
        } catch (error) {
            console.error('Error al eliminar item:', error);
        }
    };

    // Evento para vaciar carrito
    clearCartBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/vaciar-carrito', {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadCart(); // Recargar carrito
            }
        } catch (error) {
            console.error('Error al vaciar carrito:', error);
        }
    });
});