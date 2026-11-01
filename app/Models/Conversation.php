<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    protected $fillable = [
        'participant_one_id',
        'participant_two_id',
        'product_id',
        'context_key',
        'last_message_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
    ];

    public function participantOne()
    {
        return $this->belongsTo(User::class, 'participant_one_id');
    }

    public function participantTwo()
    {
        return $this->belongsTo(User::class, 'participant_two_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function latestMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }
}
