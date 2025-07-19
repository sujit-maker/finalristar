"use client";

import React, { useEffect, useState } from 'react';
import { History, HistoryIcon, Pencil, Search, Trash2, Filter, X } from "lucide-react";
import AddContainerForm from '../inventory/CreateInventoryForm';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import MovementHistoryModal from './MovementHistoryModal';

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={
      "inline-block px-4 py-1 rounded-full text-sm font-semibold shadow transition-all duration-300 hover:scale-105 " +
      (status === "Active"
        ? "bg-green-900/80 text-green-300"
        : "bg-red-900/80 text-red-300")
    }
    style={{
      minWidth: 70,
      textAlign: "center",
      letterSpacing: 1,
      cursor: "default",
    }}
  >
    {status === "Active" ? "Active" : "Inactive"}
  </span>
);

const ProductsInventoryPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [, setShowTable] = useState(false);
  type AddressBookEntry = { id: number; companyName: string;[key: string]: any };
  const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedContainerNumber, setSelectedContainerNumber] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    ownership: "",
    status: "",
    initialSurveyDate: ""
  });
  const [tempFilters, setTempFilters] = useState({
    ownership: "",
    status: "",
    initialSurveyDate: ""
  });

  const handleAddContainerClick = () => {
    setSelectedInventoryId(null);
    setShowModal(true);
    setShowTable(true);
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const response = await axios.get('http://localhost:8000/inventory');
      setInventoryData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setLoading(false);
    }
  };

  const handleEditClick = (id: number): void => {
    setSelectedInventoryId(id);
    setShowModal(true);
  };

  const handleDelete = async (id: number): Promise<void> => {
    try {
      await axios.delete(`http://localhost:8000/inventory/${id}`);
      setInventoryData(inventoryData.filter((item) => item.id !== id));
      alert('Inventory deleted successfully');
    } catch (error: any) {
      console.error('Error deleting inventory:', error.response?.data || error);
      alert('Failed to delete inventory: ' + (error.response?.data?.message || error.message));
    }
  };

  useEffect(() => {
    fetch("http://localhost:8000/addressbook")
      .then((res) => res.json())
      .then((data) => setAddressBook(data))
      .catch((err) => console.error("Failed to fetch address book", err));
  }, []);

  const handleViewHistory = (containerNumber: string) => {
    setSelectedContainerNumber(containerNumber);
    setShowHistoryModal(true);
  };

  const getCompanyName = (addressbookId: any) => {
    const entry = addressBook.find((ab) => ab.id === addressbookId);
    return entry ? entry.companyName : "Unknown";
  };


  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedInventoryId(null);
    fetchInventoryData();
  };

  // Filter data based on search term AND filters
  const filteredData = inventoryData.filter((item) => {
    const matchesSearch = item.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.containerType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.containerClass.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOwnership = !filters.ownership || 
      (item.leasingInfo?.[0]?.ownershipType || item.ownershipType || "Own").toLowerCase() === filters.ownership.toLowerCase();
    
    const matchesStatus = !filters.status || 
      item.status.toLowerCase() === filters.status.toLowerCase();
    
    const matchesInitialSurveyDate = !filters.initialSurveyDate || 
      (item.InitialSurveyDate && item.InitialSurveyDate.startsWith(filters.initialSurveyDate));
    
    return matchesSearch && matchesOwnership && matchesStatus && matchesInitialSurveyDate;
  });

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      ownership: "",
      status: "",
      initialSurveyDate: ""
    };
    setFilters(clearedFilters);
    setTempFilters(clearedFilters);
    setShowFilterModal(false);
  };

  const handleResetTempFilters = () => {
    setTempFilters({
      ownership: "",
      status: "",
      initialSurveyDate: ""
    });
  };

  // Check if any filters are active
  const hasActiveFilters = filters.ownership || filters.status || filters.initialSurveyDate;

  return (
    <div className="px-4 py-6 bg-black min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center w-full max-w-sm">
            <Search size={18} className="absolute left-3 text-gray-400" />
            <Input
              placeholder="Search containers..."
              className="pl-10 bg-neutral-900 border-neutral-800 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter Button */}
          <Button
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-2 px-4 py-2 cursor-pointer rounded-lg transition-colors ${
              hasActiveFilters 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-neutral-700 hover:bg-neutral-600 text-white'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filter
            {hasActiveFilters && (
              <span className="ml-1 bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-medium">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          onClick={handleAddContainerClick}
        >
          Add Container
        </Button>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-sm text-neutral-400">Active filters:</span>
          {filters.ownership && (
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
              Ownership: {filters.ownership}
              <button
                onClick={() => setFilters(prev => ({ ...prev, ownership: "" }))}
                className="ml-1 hover:bg-blue-700 rounded-full p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.status && (
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
              Status: {filters.status}
              <button
                onClick={() => setFilters(prev => ({ ...prev, status: "" }))}
                className="ml-1 hover:bg-blue-700 rounded-full p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.initialSurveyDate && (
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
              Survey Date: {filters.initialSurveyDate}
              <button
                onClick={() => setFilters(prev => ({ ...prev, initialSurveyDate: "" }))}
                className="ml-1 hover:bg-blue-700 rounded-full p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="rounded-lg border border-neutral-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-900">
            <TableRow>
              <TableHead className="text-neutral-200">Ownership</TableHead>
              <TableHead className="text-neutral-200">Owner/Leaser</TableHead>

              <TableHead className="text-neutral-200">Container No</TableHead>
              <TableHead className="text-neutral-200">Category</TableHead>
              <TableHead className="text-neutral-200">Type</TableHead>
              <TableHead className="text-neutral-200">Class</TableHead>
              <TableHead className="text-neutral-200">Capacity</TableHead>
              <TableHead className="text-neutral-200">Next Inspection Due Date</TableHead>
              <TableHead className="text-neutral-200">Off Hire Date</TableHead>
              <TableHead className="text-neutral-200">Status</TableHead>
              <TableHead className="text-neutral-200 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-4 text-neutral-400">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-4 text-neutral-400">
                  No inventory data found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id} className="border-b border-neutral-800 bg-neutral-900 hover:bg-neutral-800">
                  <TableCell className="text-neutral-200">
                    {/* First check if there are leasing records with ownershipType */}
                    {item.leasingInfo?.length > 0 && item.leasingInfo[0].ownershipType
                      ? item.leasingInfo[0].ownershipType
                      : /* If no leasing records or no ownershipType in leasing record, use the top-level ownershipType */
                      (item.ownershipType ||
                        /* If there are leasing records but no ownershipType, default to "Lease" */
                        (item.leasingInfo?.length > 0 ? "Lease" : "Own"))}
                  </TableCell>
                  <TableCell className="text-neutral-200">
                    {item.leasingInfo?.[0]?.ownershipType === "Own"
                      ? "RISTAR"
                      : item.leasingInfo?.[0]
                        ? getCompanyName(item.leasingInfo[0].leasoraddressbookId)
                        : "N/A"}
                  </TableCell>


                  <TableCell className="text-neutral-200">{item.containerNumber}</TableCell>
                  <TableCell className="text-neutral-200">{item.containerCategory}</TableCell>
                  <TableCell className="text-neutral-200">{item.containerType}</TableCell>
                  <TableCell className="text-neutral-200">{item.containerClass}</TableCell>
                  <TableCell className="text-neutral-200">{item.containerCapacity}</TableCell>
                  <TableCell className="text-neutral-200">
                    {item.periodicTankCertificates?.[0]?.nextDueDate
                      ? new Date(item.periodicTankCertificates[0].nextDueDate).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-neutral-200">
                    {item.leasingInfo?.[0]?.offHireDate
                      ? new Date(item.leasingInfo[0].offHireDate).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 cursor-pointer"
                        onClick={() => handleEditClick(item.id)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/40 cursor-pointer"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                      <Button
                        title="View History"
                        className="text-green-400 hover:text-green-500"
                        onClick={() => handleViewHistory(item.containerNumber)}
                      >
                        <HistoryIcon size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) handleCloseModal();
        setShowModal(open);
      }}>
        <DialogContent
          className="
      bg-neutral-900 border border-neutral-800
      max-h-[90vh] overflow-y-auto
      backdrop-blur-md
      "
          style={{
            // Narrower width to prevent horizontal scrolling
            width: "85vw",
            maxWidth: "950px"
          }}
        >
          <DialogTitle className="sr-only">
            {selectedInventoryId ? 'Edit Container' : 'Add Container'}
          </DialogTitle>
          {showModal && (
            <AddContainerForm
              onClose={handleCloseModal}
              inventoryId={selectedInventoryId || 0}
              editData={selectedInventoryId ? inventoryData.find(item => item.id === selectedInventoryId) : null}
              isEditMode={!!selectedInventoryId}
            />
          )}
        </DialogContent>
      </Dialog>

      {showHistoryModal && selectedContainerNumber && (
        <MovementHistoryModal
          containerNumber={selectedContainerNumber}
          onClose={() => setShowHistoryModal(false)}
          
        />
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-lg">
          <div className="bg-neutral-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Filter Inventory</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilterModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Ownership Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Ownership Type
                </label>
                <select
                  value={tempFilters.ownership}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, ownership: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-700 text-white rounded border border-neutral-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Ownership Types</option>
                  <option value="Own">Own</option>
                  <option value="Leased">Leased</option>
                </select>
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Status
                </label>
                <select
                  value={tempFilters.status}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-700 text-white rounded border border-neutral-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              
              {/* Initial Survey Date Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Initial Survey Date (Year)
                </label>
                <input
                  type="date"
                  placeholder="Select date"
                  value={tempFilters.initialSurveyDate}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, initialSurveyDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-700 text-white rounded border border-neutral-600 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-neutral-400 mt-1">
                  Filter by year (e.g., 2024) or specific date (YYYY-MM-DD)
                </p>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <Button
                variant="ghost"
                onClick={handleResetTempFilters}
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Reset
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowFilterModal(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </Button>
                {/* <Button
                  onClick={handleClearFilters}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Clear All
                </Button> */}
                <Button
                  onClick={handleApplyFilters}
                  className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ...existing table code... */}
    </div>
  );
};

export default ProductsInventoryPage;
