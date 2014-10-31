require "sinatra"
require "json"
require_relative "models"

get "/" do
    redirect "/index.html"
end

get "/channels" do
    content_type :json
    return get_channels.to_json
end

post "/channels" do
    request.body.rewind
    data = JSON.parse request.body.read
    name = data["name"]
    content_type :json
    return create_channel(name).to_json
end

delete "/channels/:id" do |id|
    remove_channel(id)
    ""
end

get "/channels/:id/messages" do |id|
    maxKnown = params[:max] || 0
    content_type :json
    return get_channel_messages(id, maxKnown).to_json
end

post "/channels/:id/messages" do |id|
    request.body.rewind
    data = JSON.parse request.body.read
    return create_message(id, data).to_json
end
