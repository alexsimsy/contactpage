'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
}

interface CartItem extends Product {
  quantity: number;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Cloudflare T-Shirt',
    price: 29.99,
    image: '/products/tshirt.jpg',
    description: 'Comfortable cotton t-shirt with Cloudflare logo'
  },
  {
    id: 2,
    name: 'Cloudflare Hoodie',
    price: 59.99,
    image: '/products/hoodie.jpg',
    description: 'Warm and cozy hoodie perfect for any weather'
  },
  {
    id: 3,
    name: 'Cloudflare Cap',
    price: 19.99,
    image: '/products/cap.jpg',
    description: 'Stylish cap with embroidered Cloudflare logo'
  }
];

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return;
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <main className="min-h-screen bg-navy text-text-primary">
      <div className="bg-brand-blue p-8">
        <div className="flex justify-center mb-8">
          <div className="relative w-48 h-16">
            <Image
              src="/simsy-logo.png"
              alt="SIMSY Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
        {/* Products Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-text-primary">Products</h2>
          <div className="grid grid-cols-1 gap-4">
            {products.map(product => (
              <div key={product.id} className="border border-brand-blue p-4 rounded-lg bg-black/50">
                <div className="aspect-w-16 aspect-h-9 mb-4 bg-black rounded">
                  <div className="w-full h-48 bg-black rounded flex items-center justify-center">
                    <span className="text-text-secondary">Product Image</span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-text-primary">{product.name}</h3>
                <p className="text-text-secondary mb-2">{product.description}</p>
                <p className="text-lg font-bold mb-2 text-brand-blue">${product.price.toFixed(2)}</p>
                <button
                  onClick={() => addToCart(product)}
                  className="bg-brand-blue text-text-primary px-4 py-2 rounded hover:bg-brand-blue-dark transition-colors"
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-text-primary">Shopping Cart</h2>
          {cart.length === 0 ? (
            <p className="text-text-secondary">Your cart is empty</p>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="border border-brand-blue p-4 rounded-lg bg-black/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-text-primary">{item.name}</h3>
                      <p className="text-text-secondary">${item.price.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-2 py-1 border border-brand-blue rounded text-text-primary hover:bg-brand-blue-dark"
                    >
                      -
                    </button>
                    <span className="mx-2 text-text-primary">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2 py-1 border border-brand-blue rounded text-text-primary hover:bg-brand-blue-dark"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <div className="border-t border-brand-blue pt-4 mt-4">
                <div className="flex justify-between text-xl font-bold text-text-primary">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <button className="w-full mt-4 bg-brand-purple text-text-primary px-4 py-2 rounded hover:bg-opacity-90 transition-colors">
                  Checkout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
