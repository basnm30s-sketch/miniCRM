/**
 * Unit tests for API Client
 * Tests the frontend API client functions that communicate with the backend
 */

describe('API Client', () => {
  let mockFetch: jest.Mock

  beforeEach(() => {
    // Reset console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {})
    // Clear module cache first
    jest.resetModules()
    // Create fresh fetch mock for each test AFTER resetModules
    mockFetch = jest.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Admin Settings', () => {
    it('should get admin settings successfully', async () => {
      const mockSettings = { companyName: 'Test Company', currency: 'USD' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSettings,
      })

      const { getAdminSettings } = await import('../api-client')
      const result = await getAdminSettings()

      expect(result).toEqual(mockSettings)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/settings'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should return null when getting admin settings fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { getAdminSettings } = await import('../api-client')
      const result = await getAdminSettings()

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalled()
    })

    it('should save admin settings successfully', async () => {
      const mockSettings = { companyName: 'Test Company' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      })

      const { saveAdminSettings } = await import('../api-client')
      await saveAdminSettings(mockSettings)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/settings'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockSettings),
        })
      )
    })

    it('should throw error when saving admin settings fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      })

      const { saveAdminSettings } = await import('../api-client')
      await expect(saveAdminSettings({})).rejects.toThrow()
    })
  })

  describe('Customers', () => {
    it('should get all customers successfully', async () => {
      const mockCustomers = [{ id: '1', name: 'Customer 1' }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCustomers,
      })

      const { getAllCustomers } = await import('../api-client')
      const result = await getAllCustomers()

      expect(result).toEqual(mockCustomers)
    })

    it('should return empty array when getting customers fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { getAllCustomers } = await import('../api-client')
      const result = await getAllCustomers()

      expect(result).toEqual([])
    })

    it('should get customer by id successfully', async () => {
      const mockCustomer = { id: '1', name: 'Customer 1' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCustomer,
      })

      const { getCustomerById } = await import('../api-client')
      const result = await getCustomerById('1')

      expect(result).toEqual(mockCustomer)
    })

    it('should return null when customer not found (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const { getCustomerById } = await import('../api-client')
      const result = await getCustomerById('999')

      expect(result).toBeNull()
    })

    it('should save new customer successfully', async () => {
      const newCustomer = { name: 'New Customer' }
      // Customer has no ID, so getCustomerById won't be called
      // Only one call for creating the customer
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: '1', ...newCustomer }),
      })

      const { saveCustomer } = await import('../api-client')
      await saveCustomer(newCustomer)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/customers'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should update existing customer successfully', async () => {
      const existingCustomer = { id: '1', name: 'Updated Customer' }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => existingCustomer,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => existingCustomer,
        })

      const { saveCustomer } = await import('../api-client')
      await saveCustomer(existingCustomer)

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should delete customer successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const { deleteCustomer } = await import('../api-client')
      await deleteCustomer('1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/customers/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Vehicle Transactions', () => {
    it('should get all vehicle transactions successfully', async () => {
      const mockTransactions = [{ id: '1', vehicleId: 'v1', amount: 1000 }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTransactions,
      })

      const { getAllVehicleTransactions } = await import('../api-client')
      const result = await getAllVehicleTransactions()

      expect(result).toEqual(mockTransactions)
    })

    it('should get vehicle transactions with filters', async () => {
      const mockTransactions = [{ id: '1', vehicleId: 'v1', amount: 1000 }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTransactions,
      })

      const { getAllVehicleTransactions } = await import('../api-client')
      const result = await getAllVehicleTransactions('v1', '2025-01')

      expect(result).toEqual(mockTransactions)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('vehicleId=v1'),
        expect.anything()
      )
    })

    it('should get vehicle transaction by id successfully', async () => {
      const mockTransaction = { id: '1', vehicleId: 'v1', amount: 1000 }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTransaction,
      })

      const { getVehicleTransactionById } = await import('../api-client')
      const result = await getVehicleTransactionById('1')

      expect(result).toEqual(mockTransaction)
    })

    it('should return null when vehicle transaction not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      })

      const { getVehicleTransactionById } = await import('../api-client')
      const result = await getVehicleTransactionById('999')

      expect(result).toBeNull()
    })

    it('should save new vehicle transaction successfully', async () => {
      const newTransaction = { vehicleId: 'v1', amount: 1000, type: 'revenue' }
      // Transaction has no ID, so getVehicleTransactionById won't be called
      // Only one call for creating the transaction
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: '1', ...newTransaction }),
      })

      const { saveVehicleTransaction } = await import('../api-client')
      await saveVehicleTransaction(newTransaction)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vehicle-transactions'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should delete vehicle transaction successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const { deleteVehicleTransaction } = await import('../api-client')
      await deleteVehicleTransaction('1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vehicle-transactions/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Expense Categories', () => {
    it('should get all expense categories successfully', async () => {
      const mockCategories = [{ id: '1', name: 'Fuel', type: 'expense' }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCategories,
      })

      const { getAllExpenseCategories } = await import('../api-client')
      const result = await getAllExpenseCategories()

      expect(result).toEqual(mockCategories)
    })

    it('should get expense category by id successfully', async () => {
      const mockCategory = { id: '1', name: 'Fuel', type: 'expense' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCategory,
      })

      const { getExpenseCategoryById } = await import('../api-client')
      const result = await getExpenseCategoryById('1')

      expect(result).toEqual(mockCategory)
    })

    it('should return null when expense category not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      })

      const { getExpenseCategoryById } = await import('../api-client')
      const result = await getExpenseCategoryById('999')

      expect(result).toBeNull()
    })

    it('should save expense category successfully', async () => {
      const category = { name: 'Fuel', type: 'expense' }
      // Category has no ID, so getExpenseCategoryById won't be called
      // Only one call for creating the category
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: '1', ...category }),
      })

      const { saveExpenseCategory } = await import('../api-client')
      await saveExpenseCategory(category)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/expense-categories'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should delete expense category successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const { deleteExpenseCategory } = await import('../api-client')
      await deleteExpenseCategory('1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/expense-categories/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Vehicle Profitability', () => {
    it('should get vehicle profitability successfully', async () => {
      const mockProfitability = {
        vehicleId: 'v1',
        totalRevenue: 10000,
        totalExpenses: 5000,
        profit: 5000,
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockProfitability,
      })

      const { getVehicleProfitability } = await import('../api-client')
      const result = await getVehicleProfitability('v1')

      expect(result).toEqual(mockProfitability)
    })

    it('should throw error when getting vehicle profitability fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({ error: 'Server error' }),
      })

      const { getVehicleProfitability } = await import('../api-client')
      await expect(getVehicleProfitability('v1')).rejects.toThrow()
    })
  })

  describe('Vehicle Finance Dashboard', () => {
    it('should get vehicle finance dashboard successfully', async () => {
      const mockDashboard = {
        overall: { totalRevenue: 100000, totalExpenses: 50000 },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockDashboard,
      })

      const { getVehicleFinanceDashboard } = await import('../api-client')
      const result = await getVehicleFinanceDashboard()

      expect(result).toEqual(mockDashboard)
    })

    it('should return null when dashboard not found (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      })

      const { getVehicleFinanceDashboard } = await import('../api-client')
      const result = await getVehicleFinanceDashboard()

      expect(result).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { getAllCustomers } = await import('../api-client')
      const result = await getAllCustomers()

      expect(result).toEqual([])
    })

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Not JSON')
        },
      })

      const { saveAdminSettings } = await import('../api-client')
      await expect(saveAdminSettings({})).rejects.toThrow()
    })

    it('should handle 204 No Content responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      // This tests the apiRequest function indirectly
      const { deleteCustomer } = await import('../api-client')
      await deleteCustomer('1')

      expect(mockFetch).toHaveBeenCalled()
    })
  })
})

