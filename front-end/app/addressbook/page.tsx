import React from 'react';
import SidebarWithHeader from '../components/Sidebar';
import AddressBookPage from './AddressBook';

export default function Customers() {
  return (
    <SidebarWithHeader>
      <AddressBookPage />
    </SidebarWithHeader>
  );
}