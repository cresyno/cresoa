'use client';
import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export function CartProvider({ children, businessId }) {
  const [cart, setCart] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load cart from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${businessId}`)
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)) } catch (e) {}
    }
    setIsLoaded(true)
  }, [businessId])

  // Save cart to local storage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(`cart_${businessId}`, JSON.stringify(cart))
    }
  }, [cart, businessId, isLoaded])

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)
      }
      return [...prev, { ...product, quantity }]
    })
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) return removeFromCart(productId)
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity } : item))
  }

  const clearCart = () => setCart([])

  const cartTotal = cart.reduce((total, item) => total + (Number(item.selling_price) * item.quantity), 0)
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0)

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount, isLoaded }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
