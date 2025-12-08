import { IsMongoId, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class GenerateDepartmentReportDto {
    @IsMongoId()
    @IsNotEmpty()
    departmentId: string;

    @IsDateString()
    @IsNotEmpty()
    startDate: Date;

    @IsDateString()
    @IsNotEmpty()
    endDate: Date;
}

export interface DepartmentReportResponse {
    reportType: 'department-payroll';
    department: {
        id: string;
        name: string;
        code: string;
    };
    period: string;
    totalEmployees: number;
    salaryDistribution: {
        totalGrossSalary: number;
        totalDeductions: number;
        totalNetPay: number;
        averageGrossSalary: number;
        averageNetPay: number;
        highestSalary: number;
        lowestSalary: number;
    };
    employeeBreakdown: Array<{
        employeeId: string;
        employeeName: string;
        employeeCode: string;
        totalGrossSalary: number;
        totalDeductions: number;
        totalNetPay: number;
        payslipsCount: number;
    }>;
    budgetAnalysis: {
        totalPayrollCost: number;
        taxesPaid: number;
        insurancePaid: number;
        benefitsPaid: number;
    };
    generatedAt: Date;
}
