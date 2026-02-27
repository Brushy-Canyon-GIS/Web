/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PhotoDetailResponse } from '../models/PhotoDetailResponse';
import type { PhotoListResponse } from '../models/PhotoListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PhotosService {
    /**
     * List all photos
     * Returns a list of all photo panels with metadata.
     * @param limit Maximum number of photos to return
     * @param offset Number of photos to skip
     * @param name Filter by name (partial match)
     * @returns PhotoListResponse Successful Response
     * @throws ApiError
     */
    public static listPhotosApiV1PhotosGet(
        limit: number = 100,
        offset?: number,
        name?: (string | null),
    ): CancelablePromise<PhotoListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/photos',
            query: {
                'limit': limit,
                'offset': offset,
                'name': name,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get photos in bounding box
     * Returns photos that intersect with the specified bounding box.
     * @param minLng Minimum longitude (west)
     * @param minLat Minimum latitude (south)
     * @param maxLng Maximum longitude (east)
     * @param maxLat Maximum latitude (north)
     * @param limit Maximum number of photos to return
     * @param offset Number of photos to skip
     * @returns PhotoListResponse Successful Response
     * @throws ApiError
     */
    public static getPhotosInBboxApiV1PhotosBboxGet(
        minLng: number,
        minLat: number,
        maxLng: number,
        maxLat: number,
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<PhotoListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/photos/bbox',
            query: {
                'min_lng': minLng,
                'min_lat': minLat,
                'max_lng': maxLng,
                'max_lat': maxLat,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get photo details
     * Returns detailed information about a specific photo.
     * @param photoId
     * @returns PhotoDetailResponse Successful Response
     * @throws ApiError
     */
    public static getPhotoApiV1PhotosPhotoIdGet(
        photoId: number,
    ): CancelablePromise<PhotoDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/photos/{photo_id}',
            path: {
                'photo_id': photoId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get photo URL
     * Returns the URL or filename for a specific photo.
     * @param photoId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getPhotoUrlApiV1PhotosPhotoIdUrlGet(
        photoId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/photos/{photo_id}/url',
            path: {
                'photo_id': photoId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get photo url
     * Returns the url of the photo by its name
     * @param photoName
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getPhotoUrlByNameApiV1PhotosPhotourlPhotoNameGet(
        photoName: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/photos/photourl/{photo_name}',
            path: {
                'photo_name': photoName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
