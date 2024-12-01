// En public/js/carrito.js

// Función para agregar al carrito
async function agregarAlCarrito(productoId, cantidad = 1) {
    try {
        const response = await fetch('/carrito/agregar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productoId, cantidad })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Mostrar mensaje de éxito
            mostrarMensaje('Producto agregado al carrito', 'success');
            // Actualizar el contador del carrito si lo tienes
            actualizarContadorCarrito();
        } else {
            mostrarMensaje('Error al agregar el producto', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al agregar el producto', 'error');
    }
}

// Función para actualizar cantidad
async function actualizarCantidad(productoId, cantidad) {
    if (cantidad < 1) return; // Evitar cantidades negativas
    
    try {
        const response = await fetch('/carrito/actualizar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productoId, cantidad })
        });
        
        const data = await response.json();
        
        if (data.success) {
            actualizarVistaCarrito();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al actualizar la cantidad', 'error');
    }
}

// Función para eliminar del carrito
async function eliminarDelCarrito(productoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto del carrito?')) {
        return;
    }
    
    try {
        const response = await fetch(`/carrito/eliminar/${productoId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Eliminar el elemento del DOM
            const elementoCarrito = document.querySelector(`[data-producto-id="${productoId}"]`);
            if (elementoCarrito) {
                elementoCarrito.remove();
            }
            actualizarTotalCarrito();
            mostrarMensaje('Producto eliminado del carrito', 'success');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al eliminar el producto', 'error');
    }
}

// Función para actualizar el total del carrito
function actualizarTotalCarrito() {
    const itemsCarrito = document.querySelectorAll('.item-carrito');
    let total = 0;
    
    itemsCarrito.forEach(item => {
        const precio = parseFloat(item.dataset.precio);
        const cantidad = parseInt(item.querySelector('.cantidad-input').value);
        total += precio * cantidad;
    });
    
    const totalElement = document.getElementById('total-carrito');
    if (totalElement) {
        totalElement.textContent = `$${total.toFixed(2)}`;
    }
}

// Función para mostrar mensajes
function mostrarMensaje(mensaje, tipo) {
    // Aquí puedes implementar tu propia lógica para mostrar mensajes
    // Por ejemplo, usando un elemento toast o alert
    alert(mensaje);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Escuchar cambios en las cantidades
    document.querySelectorAll('.cantidad-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const productoId = e.target.closest('.item-carrito').dataset.productoId;
            actualizarCantidad(productoId, e.target.value);
        });
    });
    
    // Escuchar clics en botones de eliminar
    document.querySelectorAll('.eliminar-producto').forEach(button => {
        button.addEventListener('click', (e) => {
            const productoId = e.target.closest('.item-carrito').dataset.productoId;
            eliminarDelCarrito(productoId);
        });
    });
});
