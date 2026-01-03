import { APIRequestContext, expect } from '@playwright/test';

export class ApiHelper {
    private request: APIRequestContext;

    constructor(request: APIRequestContext) {
        this.request = request;
    }

    async createCustomer(name: string, email: string = 'test@example.com', phone: string = '1234567890') {
        const id = Date.now().toString();
        const response = await this.request.post('/api/customers', {
            data: {
                id,
                name,
                email,
                phone,
                address: '123 Test St'
            }
        });
        if (!response.ok()) {
            throw new Error(`Create Customer Failed: ${response.status()} ${await response.text()}`);
        }
        expect(response.ok()).toBeTruthy();
        return id;
    }

    async deleteCustomer(id: string | number) {
        const response = await this.request.delete(`/api/customers/${id}`);
        expect(response.ok()).toBeTruthy();
    }

    async createEmployee(name: string, employeeId: string, monthlySalary: number = 5000) {
        const id = Date.now().toString();
        const response = await this.request.post('/api/employees', {
            data: {
                id,
                name,
                employeeId,
                email: `${employeeId}@example.com`,
                phone: '1234567890',
                role: 'Employee',
                hourlyRate: 0,
                salary: monthlySalary,
                bankDetails: 'Bank of Test',
                paymentType: 'Monthly',
                status: 'Active'
            }
        });
        if (!response.ok()) {
            console.log('Create Employee Failed:', response.status(), await response.text());
        }
        expect(response.ok()).toBeTruthy();
        return id;
    }

    async deleteEmployee(id: string | number) {
        const response = await this.request.delete(`/api/employees/${id}`);
        expect(response.ok()).toBeTruthy();
    }

    async createQuote(customerId: string | number, items: any[]) {
        const id = Date.now().toString();
        const response = await this.request.post('/api/quotes', {
            data: {
                id,
                customerId,
                date: new Date().toISOString().split('T')[0],
                status: 'Draft',
                items,
                subtotal: 0,
                total: 0,
                number: `Q-${Date.now()}`
            }
        });
        if (!response.ok()) {
            console.log('Create Quote Failed:', response.status(), await response.text());
        }
        expect(response.ok()).toBeTruthy();
        return id;
    }

    async createVehicle(number: string, type: string = 'Sedan') {
        const id = Date.now().toString();
        const response = await this.request.post('/api/vehicles', {
            data: {
                id,
                vehicleNumber: number,
                vehicleType: type,
                type: number, // Legacy column - copy vehicleNumber for backward compatibility
                make: 'Toyota',
                model: 'Camry',
                year: 2024,
                status: 'active',
                basePrice: 100
            }
        });
        if (!response.ok()) {
            console.log('Create Vehicle Failed:', response.status(), await response.text());
            throw new Error(`Create Vehicle Failed: ${response.status()}`);
        }
        expect(response.ok()).toBeTruthy();
        return id;
    }

    async deleteVehicle(id: string | number) {
        const response = await this.request.delete(`/api/vehicles/${id}`);
        expect(response.ok()).toBeTruthy();
    }
}
