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
 * @interface SentimentAnalysisPublic
 */
export interface SentimentAnalysisPublic {
    /**
     * 
     * @type {string}
     * @memberof SentimentAnalysisPublic
     */
    answerId: string;
    /**
     * 
     * @type {string}
     * @memberof SentimentAnalysisPublic
     */
    algorithm: string;
    /**
     * 
     * @type {string}
     * @memberof SentimentAnalysisPublic
     */
    verdict: string;
    /**
     * 
     * @type {number}
     * @memberof SentimentAnalysisPublic
     */
    compound: number;
    /**
     * 
     * @type {number}
     * @memberof SentimentAnalysisPublic
     */
    positive: number;
    /**
     * 
     * @type {number}
     * @memberof SentimentAnalysisPublic
     */
    neutral: number;
    /**
     * 
     * @type {number}
     * @memberof SentimentAnalysisPublic
     */
    negative: number;
    /**
     * 
     * @type {number}
     * @memberof SentimentAnalysisPublic
     */
    score?: number;
    /**
     * 
     * @type {string}
     * @memberof SentimentAnalysisPublic
     */
    id: string;
}

/**
 * Check if a given object implements the SentimentAnalysisPublic interface.
 */
export function instanceOfSentimentAnalysisPublic(value: object): value is SentimentAnalysisPublic {
    if (!('answerId' in value) || value['answerId'] === undefined) return false;
    if (!('algorithm' in value) || value['algorithm'] === undefined) return false;
    if (!('verdict' in value) || value['verdict'] === undefined) return false;
    if (!('compound' in value) || value['compound'] === undefined) return false;
    if (!('positive' in value) || value['positive'] === undefined) return false;
    if (!('neutral' in value) || value['neutral'] === undefined) return false;
    if (!('negative' in value) || value['negative'] === undefined) return false;
    if (!('id' in value) || value['id'] === undefined) return false;
    return true;
}

export function SentimentAnalysisPublicFromJSON(json: any): SentimentAnalysisPublic {
    return SentimentAnalysisPublicFromJSONTyped(json, false);
}

export function SentimentAnalysisPublicFromJSONTyped(json: any, ignoreDiscriminator: boolean): SentimentAnalysisPublic {
    if (json == null) {
        return json;
    }
    return {
        
        'answerId': json['answer_id'],
        'algorithm': json['algorithm'],
        'verdict': json['verdict'],
        'compound': json['compound'],
        'positive': json['positive'],
        'neutral': json['neutral'],
        'negative': json['negative'],
        'score': json['score'] == null ? undefined : json['score'],
        'id': json['id'],
    };
}

export function SentimentAnalysisPublicToJSON(json: any): SentimentAnalysisPublic {
    return SentimentAnalysisPublicToJSONTyped(json, false);
}

export function SentimentAnalysisPublicToJSONTyped(value?: SentimentAnalysisPublic | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'answer_id': value['answerId'],
        'algorithm': value['algorithm'],
        'verdict': value['verdict'],
        'compound': value['compound'],
        'positive': value['positive'],
        'neutral': value['neutral'],
        'negative': value['negative'],
        'score': value['score'],
        'id': value['id'],
    };
}

