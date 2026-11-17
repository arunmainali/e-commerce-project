import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full hairline-t bg-background mt-12 py-8 text-xs text-secondary">
      <div className="max-w-[1440px] mx-auto px-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left mb-8">
          <div>
            <h4 className="font-semibold text-primary mb-2 uppercase tracking-wider text-[11px]">
              Auction Studio
            </h4>
            <ul className="space-y-1">
              <li>
                <Link to="/" className="hover:underline hover:text-primary">
                  Home Catalog
                </Link>
              </li>
              <li>
                <Link to="/items" className="hover:underline hover:text-primary">
                  All Department Listings
                </Link>
              </li>
              <li>
                <a href="#about" className="hover:underline hover:text-primary">
                  About Our House
                </a>
              </li>
              <li>
                <a href="#standards" className="hover:underline hover:text-primary">
                  Condition & Grading Standards
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary mb-2 uppercase tracking-wider text-[11px]">
              Bidding & Buying
            </h4>
            <ul className="space-y-1">
              <li>
                <a href="#how-to-bid" className="hover:underline hover:text-primary">
                  How Auction Bidding Works
                </a>
              </li>
              <li>
                <a href="#premium" className="hover:underline hover:text-primary">
                  Buyer&apos;s Premium (10%)
                </a>
              </li>
              <li>
                <a href="#shipping" className="hover:underline hover:text-primary">
                  Shipping & Specialized Freight
                </a>
              </li>
              <li>
                <a href="#guarantee" className="hover:underline hover:text-primary">
                  Authenticity Guarantee
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary mb-2 uppercase tracking-wider text-[11px]">
              Consign & Sell
            </h4>
            <ul className="space-y-1">
              <li>
                <a href="#sell" className="hover:underline hover:text-primary">
                  Consign With Us
                </a>
              </li>
              <li>
                <a href="#valuations" className="hover:underline hover:text-primary">
                  Complimentary Valuations
                </a>
              </li>
              <li>
                <a href="#corporate" className="hover:underline hover:text-primary">
                  Estate & Museum Services
                </a>
              </li>
              <li>
                <a href="#terms-sellers" className="hover:underline hover:text-primary">
                  Consignor Terms
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary mb-2 uppercase tracking-wider text-[11px]">
              Client Support
            </h4>
            <ul className="space-y-1">
              <li>
                <Link to="/account" className="hover:underline hover:text-primary">
                  Account Dashboard
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="hover:underline hover:text-primary">
                  Saved Lots
                </Link>
              </li>
              <li>
                <a href="#contact" className="hover:underline hover:text-primary">
                  Contact Specialist Desk
                </a>
              </li>
              <li>
                <a href="#terms" className="hover:underline hover:text-primary">
                  Terms & Conditions
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="hairline-t pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-disabled gap-2">
          <div>
            © {new Date().getFullYear()} Auction Studio LLC. Designed according to International Typographic & McMaster-Carr functional specifications.
          </div>
          <div className="flex gap-4">
            <span>Grid: 12-col / 24px gutter</span>
            <span>Scale: 8px baseline</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
