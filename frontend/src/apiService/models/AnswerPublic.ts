/* tslint:disable */
/* eslint-disable */
/**
 * FastAPI
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface AnswerPublic
 */
export interface AnswerPublic {
    /**
     * 
     * @type {string}
     * @memberof AnswerPublic
     */
    questionId: string;
    /**
     * 
     * @type {string}
     * @memberof AnswerPublic
     */
    text: string;
    /**
     * 
     * @type {string}
     * @memberof AnswerPublic
     */
    id: string;
}

/**
 * Check if a given object implements the AnswerPublic interface.
 */
export function instanceOfAnswerPublic(value: object): value is AnswerPublic {
    if (!('questionId' in value) || value['questionId'] === undefined) return false;
    if (!('text' in value) || value['text'] === undefined) return false;
    if (!('id' in value) || value['id'] === undefined) return false;
    return true;
}

export function AnswerPublicFromJSON(json: any): AnswerPublic {
    return AnswerPublicFromJSONTyped(json, false);
}

export function AnswerPublicFromJSONTyped(json: any, ignoreDiscriminator: boolean): AnswerPublic {
    if (json == null) {
        return json;
    }
    return {
        
        'questionId': json['question_id'],
        'text': json['text'],
        'id': json['id'],
    };
}

export function AnswerPublicToJSON(json: any): AnswerPublic {
    return AnswerPublicToJSONTyped(json, false);
}

export function AnswerPublicToJSONTyped(value?: AnswerPublic | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'question_id': value['questionId'],
        'text': value['text'],
        'id': value['id'],
    };
}

