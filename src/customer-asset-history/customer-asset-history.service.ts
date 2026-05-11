import { Injectable } from '@nestjs/common';
import { CustomerAssetHistoryQueryDto } from './dto/customer-asset-history-query.dto';
import { CustomerAssetHistoryResponseDto } from './dto/customer-asset-history-response.dto';
import { CustomerAssetHistoryRepository } from './persistence/customer-asset-history.repository';

@Injectable()
export class CustomerAssetHistoryService {
  constructor(
    private readonly repository: CustomerAssetHistoryRepository,
  ) {
    void this.repository;
  }

  getCustomerHistory(
    customerId: string,
    query: CustomerAssetHistoryQueryDto,
  ): Promise<CustomerAssetHistoryResponseDto> {
    void customerId;
    void query;

    throw new Error('Not implemented');
  }

  getVehicleHistory(
    vehicleId: string,
    query: CustomerAssetHistoryQueryDto,
  ): Promise<CustomerAssetHistoryResponseDto> {
    void vehicleId;
    void query;

    throw new Error('Not implemented');
  }

  getComponentHistory(
    componentId: string,
    query: CustomerAssetHistoryQueryDto,
  ): Promise<CustomerAssetHistoryResponseDto> {
    void componentId;
    void query;

    throw new Error('Not implemented');
  }
}
