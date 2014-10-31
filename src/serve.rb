require "sinatra"

get "/" do
    redirect "/index.html"
end

get "/test" do
    return "hey"
end
